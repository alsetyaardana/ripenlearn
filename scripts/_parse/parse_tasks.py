"""Extract 任务大纲 (Task Syllabus) from data/hsk_bbox.xml -> data/tasks.json

PDF pages 5-57 (1-indexed). Structure per level: a centered "HSK（X级）任务"
header, then numbered category headings ("一、问答个人基本信息", left-aligned,
no bullet glyph), each followed by a handful of bullet items (bullet glyph
U+F0D8 "" at x~95, wrapped continuation lines re-indented to x~117 with
no bullet glyph). Levels 7-9 are described together under one
"HSK（七—九级）任务" header and are additionally organized by top-level scene
("生活和社交场景" etc, not modeled in Prisma's Task -- dropped) and by
理解/表达/翻译 (comprehension/expression/translation) dimensions rather than
the 听/说/读/写 four-skill split used at levels 1-6.

skillType (LISTENING/SPEAKING/READING/WRITING) is not marked explicitly in the
source text -- it must be inferred from each bullet's opening verb. We use a
keyword heuristic (听懂 -> LISTENING; 看懂/读懂/识别 -> READING; 能写/译成/翻译
-> WRITING; everything else, e.g. 询问/回答/介绍/表达/说明 -> SPEAKING).

KNOWN LIMITATIONS (flagged for manual review):
- The level-7-9 section only has ONE combined header ("七—九级"); every task
  bullet under it is tagged hskLevel=7 (lowest of the range) since the source
  does not say which of 7/8/9 a given task first applies to.
- The heuristic skillType classification is approximate, especially for
  level 7-9 bullets phrased as "能以口头或书面形式..." (oral-OR-written) which
  don't cleanly map to a single skill; translation ("译成") bullets are bucketed
  as WRITING as the closest fit even though the source treats 翻译 as its own
  third dimension, distinct from 表达(speaking/writing) and 理解(listening/
  reading).
"""
import json
import re
import sys

sys.path.insert(0, "scripts/_parse")
from bbox_common import load_pages, cluster_rows

CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
BULLET = ""


def cn_level(s):
    s = s.replace("级", "")
    parts = re.split(r"[—-]", s)
    nums = [CN_NUM[p] for p in parts if p in CN_NUM]
    return min(nums) if nums else None


def classify_skill(text):
    if "听懂" in text:
        return "LISTENING"
    if "看懂" in text or "读懂" in text or "识别" in text:
        return "READING"
    if "能写" in text or "译成" in text or "翻译" in text:
        return "WRITING"
    return "SPEAKING"


HEADER_RE = re.compile(r"^HSK[（(](.+?)[）)]任务$")
CATEGORY_RE = re.compile(r"^[一二三四五六七八九十]+、")


def main():
    pages = load_pages("data/hsk_bbox.xml")
    results = []
    cur_level = None
    cur_category = None
    cur_bullets = []  # list of str fragments for current bullet
    cur_skill_hint = None

    def flush_bullet():
        if cur_level is not None and cur_category is not None and cur_bullets:
            text = "".join(cur_bullets).strip()
            if text:
                results.append({
                    "hskLevel": cur_level,
                    "category": cur_category,
                    "description": text,
                    "skillType": classify_skill(text),
                })

    for page_idx in range(4, 57):  # pdf pages 5..57 inclusive
        words = pages[page_idx]
        rows = cluster_rows(words, y_tol=4.0)
        for row in rows:
            if len(row) == 1 and re.match(r"^\d+$", row[0].text):
                continue  # footer page number
            first_text = row[0].text
            m = HEADER_RE.match(first_text) if len(row) == 1 else None
            if m:
                flush_bullet()
                cur_bullets = []
                cur_level = cn_level(m.group(1))
                cur_category = None
                continue
            if CATEGORY_RE.match(first_text) and row[0].x0 < 110:
                flush_bullet()
                cur_bullets = []
                cur_category = first_text
                continue
            if row[0].text == BULLET:
                flush_bullet()
                cur_bullets = ["".join(w.text for w in row[1:])]
                continue
            # continuation line (wrapped bullet text, no bullet glyph, x~117)
            if cur_bullets and row[0].x0 > 110:
                cur_bullets.append("".join(w.text for w in row))
                continue
            # otherwise (e.g. scene grouping lines like 生活和社交场景, or
            # intro paragraph before the first category) -- ignore, not part
            # of the Task schema.
    flush_bullet()

    with open("data/tasks.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Total task entries: {len(results)}")
    from collections import Counter
    c = Counter((r["hskLevel"], r["skillType"]) for r in results)
    for k in sorted(c, key=lambda x: (x[0] is None, x)):
        print(k, c[k])
    for r in results[:3]:
        print(r)


if __name__ == "__main__":
    main()
