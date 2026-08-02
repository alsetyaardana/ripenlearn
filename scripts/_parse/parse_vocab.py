"""Extract 词汇大纲 (Vocabulary) from data/hsk_bbox.xml -> data/vocab-parsed.json

PDF pages 80-354 (1-indexed). Five-column table (序号/等级/词语/拼音/词性), one
entry per row, NOT vertically merged (unlike Task/Topic/Grammar/Character) --
this is why -bbox-layout was worth the extra step: with plain `pdftotext
-layout` some rows visually split across two text lines because of per-cell
line-height differences (see docs/README.md's note + CLAUDE.md's parsing
problem #2), which broke naive regex parsing. In bbox space every field's
word(s) share the same row y-cluster regardless of that line-height quirk, so
column-position clustering (x0 ranges below) reconstructs every row correctly.

Column x0 ranges (calibrated by inspecting ~15 sample rows across multiple
pages):
  idx col   : x0 <  110   (序号, discarded -- not part of Card)
  level col : 110 <= x0 < 225  (等级, e.g. "1" or "1（4）")
  hanzi col : 225 <= x0 < 300  (词语)
  pinyin col: 300 <= x0 < 415  (拼音 -- sometimes 2 words, e.g. "不客气" =
              "bú" + "kèqi" as separate bbox words; joined with a space)
  pos col   : x0 >= 415        (词性)

Level notation "3（4）" -> hskLevel=3, extraLevelNote="4" (Card.extraLevelNote).

Superscript disambiguation index (本1, 点1 etc): the trailing ASCII digit is
stripped from `hanzi` per CLAUDE.md instructions (it's a homonym/sense index in
the source's superscript, not part of the character). Since Card's unique
constraint is (hanzi, hskLevel), stripping the digit can make two originally-
distinct source rows collide (e.g. 本1 and a would-be 本2 at the same level).
When that happens we MERGE them into a single Card: pinyin values are joined
with " / " if they differ, and partOfSpeech values are joined with "；" if they
differ, and a comment is printed listing every merge for manual review -- this
is a deliberate simplification since Card has no field for "N distinct senses
of one hanzi", flagged as a known limitation rather than silently discarding
one sense.
"""
import json
import re
import sys
from collections import OrderedDict, defaultdict

sys.path.insert(0, "scripts/_parse")
from bbox_common import load_pages, cluster_rows

HEADER_WORDS = {"序号", "等级", "词语", "拼音", "词性"}


def col_of(x0):
    if x0 < 110:
        return "idx"
    if x0 < 225:
        return "level"
    if x0 < 300:
        return "hanzi"
    if x0 < 415:
        return "pinyin"
    return "pos"


LEVEL_RE = re.compile(r"^(\d+(?:-\d+)?)((?:（[^（）]+）)*)$")
EXTRA_NOTE_RE = re.compile(r"（([^（）]+)）")
SUPERSCRIPT_RE = re.compile(r"^(.*\D)(\d)$")  # trailing ascii digit after non-digit


def main():
    pages = load_pages("data/hsk_bbox.xml")
    raw_rows = []
    problem_rows = []

    for page_idx in range(79, 354):  # pdf pages 80..354 inclusive
        words = pages[page_idx]
        rows = cluster_rows(words, y_tol=4.5)
        for row in rows:
            texts = {w.text for w in row}
            if texts <= HEADER_WORDS:
                continue
            if len(row) == 1 and re.match(r"^\d+$", row[0].text):
                continue  # footer page number

            cols = defaultdict(list)
            for w in row:
                cols[col_of(w.x0)].append(w.text)

            idx_v = "".join(cols.get("idx", []))
            level_v = "".join(cols.get("level", []))
            hanzi_v = "".join(cols.get("hanzi", []))
            pinyin_v = " ".join(cols.get("pinyin", []))
            pos_v = "".join(cols.get("pos", []))

            if not (idx_v.strip().isdigit() and hanzi_v and level_v):
                problem_rows.append([w.text for w in row])
                continue

            m = LEVEL_RE.match(level_v)
            if not m:
                problem_rows.append([w.text for w in row])
                continue
            main_level_str = m.group(1)
            # "7-9" style combined range (no per-word sub-level given in source) ->
            # tag with the lowest level in the range, same convention as used for
            # the combined Task/Character ranges elsewhere in this pipeline.
            hsk_level = min(int(x) for x in main_level_str.split("-"))
            extra_groups = EXTRA_NOTE_RE.findall(m.group(2) or "")
            extra_note = ", ".join(extra_groups) if extra_groups else None

            raw_rows.append({
                "hanzi": hanzi_v,
                "pinyin": pinyin_v,
                "hskLevel": hsk_level,
                "extraLevelNote": extra_note,
                "partOfSpeech": pos_v,
            })

    # strip superscript disambiguation index from hanzi
    for e in raw_rows:
        m = SUPERSCRIPT_RE.match(e["hanzi"])
        if m:
            e["hanzi"] = m.group(1)

    # merge collisions on (hanzi, hskLevel) -- the Card unique key
    grouped = OrderedDict()
    for e in raw_rows:
        key = (e["hanzi"], e["hskLevel"])
        grouped.setdefault(key, []).append(e)

    merged = []
    merge_log = []
    for key, group in grouped.items():
        if len(group) == 1:
            merged.append(group[0])
            continue
        pinyins = list(dict.fromkeys(g["pinyin"] for g in group))
        poses = list(dict.fromkeys(g["partOfSpeech"] for g in group))
        notes = [g["extraLevelNote"] for g in group if g["extraLevelNote"]]
        merged.append({
            "hanzi": key[0],
            "hskLevel": key[1],
            "pinyin": " / ".join(pinyins),
            "partOfSpeech": "；".join(poses),
            "extraLevelNote": notes[0] if notes else None,
        })
        merge_log.append((key, [g["pinyin"] for g in group]))

    # Derive Card.tipe (SHUXIE/RENDU) -- NOT a column in the source 词汇大纲 table
    # (which only has 序号/等级/词语/拼音/词性). Per CLAUDE.md, Card.tipe is a
    # different concept from Character.tipe, but there is no independent source
    # of truth for "is this WORD must-write" in the syllabus PDF. We derive it
    # heuristically from data/characters.json (must be generated first, via
    # parse_characters.py): a word is tagged SHUXIE only if every individual
    # character it's composed of is in the cumulative 书写字 (must-write) set;
    # otherwise RENDU (recognition-only), including the conservative fallback
    # for any character missing from the extracted Character syllabus entirely.
    # This is a documented judgment call, not sourced from an explicit column --
    # flagged for review.
    try:
        with open("data/characters.json", encoding="utf-8") as f:
            chars = json.load(f)
        shuxie_chars = {c["hanzi"] for c in chars if c["tipe"] == "SHUXIE"}
    except FileNotFoundError:
        print("WARNING: data/characters.json not found -- run parse_characters.py first. "
              "Defaulting every Card.tipe to RENDU.")
        shuxie_chars = set()

    for e in merged:
        e["tipe"] = "SHUXIE" if all(ch in shuxie_chars for ch in e["hanzi"]) else "RENDU"

    with open("data/vocab-parsed.json", "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"Raw rows parsed: {len(raw_rows)}")
    print(f"Merged (homonym-collision) groups: {len(merge_log)}")
    print(f"Final unique (hanzi, hskLevel) entries: {len(merged)}")
    print(f"Problem rows (skipped, could not parse): {len(problem_rows)}")
    for pr in problem_rows[:20]:
        print("  PROBLEM:", pr)
    for k, pys in merge_log[:15]:
        print("  MERGED:", k, pys)
    from collections import Counter
    c = Counter(e["hskLevel"] for e in merged)
    for k in sorted(c):
        print("level", k, c[k])


if __name__ == "__main__":
    main()
