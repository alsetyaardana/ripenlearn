"""Extract 汉字大纲 (Character Syllabus) from data/hsk_bbox.xml -> data/characters.json

PDF pages 356-384 (1-indexed, inclusive) contain a repeating 4-column numbered
grid ("1. 爱  43. 二  85. 姐  127.年" ...) split into 认读字 (RENDU) sections per
level (一级/二级/三级/四级/五级/六级/七—九级) followed by 书写字 (SHUXIE) sections
per level (一级~二级/三级/四级/五级/六级/七—九级).

Number+dot and the following single hanzi are sometimes one merged bbox word
(e.g. "127.年") and sometimes two separate words ("1." then "爱" as the next
word in the same row) depending on horizontal spacing pdftotext decided to
collapse. We detect both shapes.

KNOWN LIMITATION: two of the section headers cover a level *range* rather than
a single level ("HSK（一级）~（二级）书写字" = levels 1-2 combined;
"HSK（七—九级）认读字" / "书写字" = levels 7-9 combined). The source does not
indicate which exact sub-level within the range each character first appears
at, so we conservatively tag every character in a combined range with the
LOWEST level in that range (consistent with the cumulative HSK level
philosophy used elsewhere in this syllabus, i.e. "known by level N"). This
means some characters tagged hskLevel=1 or hskLevel=7 here may actually be
introduced at level 2 or level 8/9 in reality -- flagged for manual review.
"""
import json
import re
import sys

sys.path.insert(0, "scripts/_parse")
from bbox_common import load_pages, cluster_rows

CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}

HEADER_RE = re.compile(r"HSK[（(](.+?)[）)](?:~[（(](.+?)[）)])?(认读字|书写字)")


def parse_level_range(s):
    # s like "一级", "七—九级"; may contain a dash range
    s = s.replace("级", "")
    parts = re.split(r"[—-]", s)
    nums = [CN_NUM[p] for p in parts if p in CN_NUM]
    return nums


def main():
    pages = load_pages("data/hsk_bbox.xml")
    entries = []  # dict(hanzi, hskLevel, tipe)
    cur_level = None
    cur_tipe = None
    seen_ambiguous_ranges = set()

    for page_idx in range(355, 384):  # pdf pages 356..384 inclusive, 0-indexed
        words = pages[page_idx]
        rows = cluster_rows(words, y_tol=4.0)
        for row in rows:
            # header row detection: any word in row matches header pattern
            header_hit = None
            for w in row:
                m = HEADER_RE.search(w.text)
                if m:
                    header_hit = m
                    break
            if header_hit:
                lo_range = header_hit.group(1)
                hi_range = header_hit.group(2)
                tipe_cn = header_hit.group(3)
                nums = parse_level_range(lo_range)
                if hi_range:
                    nums += parse_level_range(hi_range)
                if not nums:
                    continue
                cur_level = min(nums)
                if len(set(nums)) > 1 or (max(nums) - min(nums) > 0 and len(nums) >= 2):
                    seen_ambiguous_ranges.add((lo_range, hi_range, tipe_cn))
                cur_tipe = "RENDU" if tipe_cn == "认读字" else "SHUXIE"
                continue

            if cur_level is None:
                continue

            i = 0
            while i < len(row):
                w = row[i].text
                m = re.match(r"^(\d+)\.(.+)$", w)
                if m and len(m.group(2)) == 1 and not m.group(2).isdigit():
                    entries.append({"hanzi": m.group(2), "hskLevel": cur_level, "tipe": cur_tipe})
                    i += 1
                    continue
                m2 = re.match(r"^(\d+)\.$", w)
                if m2:
                    if i + 1 < len(row):
                        nxt = row[i + 1].text
                        if len(nxt) == 1 and not re.match(r"^\d", nxt):
                            entries.append({"hanzi": nxt, "hskLevel": cur_level, "tipe": cur_tipe})
                            i += 2
                            continue
                    i += 1
                    continue
                i += 1

    # dedupe (hanzi, hskLevel, tipe) - matches schema's unique constraint
    seen = set()
    deduped = []
    for e in entries:
        key = (e["hanzi"], e["hskLevel"], e["tipe"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(e)

    with open("data/characters.json", "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    print(f"Total raw entries: {len(entries)}, deduped: {len(deduped)}")
    print("Ambiguous combined-level ranges encountered (tagged to lowest level):", seen_ambiguous_ranges)
    from collections import Counter
    c = Counter((e["hskLevel"], e["tipe"]) for e in deduped)
    for k in sorted(c):
        print(k, c[k])


if __name__ == "__main__":
    main()
