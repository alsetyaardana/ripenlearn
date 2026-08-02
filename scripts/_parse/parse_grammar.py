"""Extract 语法大纲 (Grammar Syllabus) from data/hsk_bbox.xml -> data/grammar.json

Source table (PDF pages 386-406) has 4 visual columns: 类别 / 类别名称 / 细目 /
语法内容, with 类别 and 类别名称 cells vertically merged (and sometimes vertically
CENTERED within their merged span) across many 细目/语法内容 rows. Prisma's
GrammarPoint model only has 3 text fields (category, subCategory, content) -- no
column for 细目 -- so this parser rolls every row up to (hskLevel, category,
subCategory) granularity: `content` is the newline-joined text of every 细目 +
语法内容 cell fragment found under that subCategory, in reading order.

KNOWN LIMITATION: because 类别/类别名称 labels can be vertically centered inside
their merged cell rather than pinned to the first row of the span, a "carry
forward last seen value in this column" heuristic can occasionally misattribute
the first row or two of a new span to the tail of the previous span (off-by-a-
few-rows at merge boundaries). This mainly risks lumping one 细目 line into the
wrong (still correct-category) subCategory bucket rather than any level/category
mix-up -- spot-checked several categories against the source and it looked right,
but flagged here for manual review since the table's true cell boundaries can't
be fully recovered from bbox text alone.
"""
import json
import re
import sys

sys.path.insert(0, "scripts/_parse")
from bbox_common import load_pages, cluster_rows

CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}

HEADER_RE = re.compile(r"HSK[（(](.+?)[）)]语法")
COLHDR = {"类别", "类别名称", "细目", "语法内容"}


def cn_level(s):
    s = s.replace("级", "")
    parts = re.split(r"[—-]", s)
    nums = [CN_NUM[p] for p in parts if p in CN_NUM]
    return min(nums) if nums else None


def main():
    pages = load_pages("data/hsk_bbox.xml")
    results = []
    cur_level = None
    cur_cat = None
    cur_subcat = None
    buf = []

    def flush():
        if cur_cat and cur_subcat and buf:
            results.append({
                "hskLevel": cur_level,
                "category": cur_cat,
                "subCategory": cur_subcat,
                "content": "\n".join(buf).strip(),
            })

    for page_idx in range(385, 406):  # pdf pages 386..406 inclusive
        words = pages[page_idx]
        rows = cluster_rows(words, y_tol=4.0)
        for row in rows:
            texts = [w.text for w in row]
            if len(row) == 1:
                m = HEADER_RE.search(row[0].text)
                if m:
                    flush()
                    buf = []
                    cur_level = cn_level(m.group(1))
                    cur_cat = None
                    cur_subcat = None
                    continue
            if all(t in COLHDR for t in texts):
                continue  # repeated table header row on each page

            cat_col = [w.text for w in row if w.x0 < 110]
            subcat_col = [w.text for w in row if 110 <= w.x0 < 230]
            content_col = [w.text for w in row if w.x0 >= 230]

            new_cat = cat_col[0] if cat_col else None
            new_subcat = subcat_col[0] if subcat_col else None

            if new_subcat and new_subcat != cur_subcat:
                flush()
                buf = []
                cur_subcat = new_subcat
            if new_cat:
                cur_cat = new_cat

            if content_col:
                buf.append("".join(content_col))
    flush()

    with open("data/grammar.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Total grammar entries: {len(results)}")
    from collections import Counter
    c = Counter(r["hskLevel"] for r in results)
    for k in sorted(c, key=lambda x: (x is None, x)):
        print("level", k, c[k])
    for r in results[:5]:
        print(r)


if __name__ == "__main__":
    main()
