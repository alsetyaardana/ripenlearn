"""Extract 话题大纲 (Topic Syllabus) from data/hsk_bbox.xml -> data/topics.json

PDF pages 59-78 (1-indexed). Three-column table (一级话题/二级话题/三级话题) with
一级话题 and 二级话题 cells vertically merged across many 三级话题 rows, AND
(per direct inspection) the merged cell's label text is rendered roughly
VERTICALLY CENTERED within its own row-span rather than pinned to the first
row -- e.g. on HSK level 1's page the "基本信息" (一级话题) label appears on the
7th data row even though its span visibly starts at row 1. A naive top-down
"carry forward the last seen column value" parse therefore mis-assigns the
leading rows of every merged group to the PREVIOUS group.

We instead use nearest-neighbor assignment: for every 三级话题 leaf row, walk
the list of 一级话题 label positions (restricted to the same HSK level section)
and pick whichever is closest by row index; same for 二级话题. Since a label is
placed near the middle of its own span, "nearest by row index" is a good proxy
for "which merged cell this row visually belongs to" and matches manual
spot-checks against the source table.

hskLevel semantics: Topic.hskLevel means "level minimum topik ini muncul" per
schema comment. The source repeats a topic's full row across multiple level
sections cumulatively (broader topic sets appear under higher levels), so
after parsing we dedupe by (levelOneName, levelTwoName, levelThreeName) -- the
Prisma @@unique key -- and keep the MINIMUM hskLevel seen, i.e. the level the
topic first appears at.
"""
import json
import re
import sys

sys.path.insert(0, "scripts/_parse")
from bbox_common import load_pages, cluster_rows

CN_NUM = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
COL_LABELS = {"一级话题", "二级话题", "三级话题"}
HEADER_RE = re.compile(r"^HSK[（(](.+?)[）)]话题$")


def cn_level(s):
    s = s.replace("级", "")
    parts = re.split(r"[—-]", s)
    nums = [CN_NUM[p] for p in parts if p in CN_NUM]
    return min(nums) if nums else None


def main():
    pages = load_pages("data/hsk_bbox.xml")
    rows_data = []  # dict(idx, level, l1, l2, l3list)
    cur_level = None
    idx = 0

    for page_idx in range(58, 78):  # pdf pages 59..78 inclusive
        words = pages[page_idx]
        rows = cluster_rows(words, y_tol=4.0)
        for row in rows:
            texts = [w.text for w in row]
            if len(row) == 1 and re.match(r"^\d+$", row[0].text):
                continue
            if len(row) == 1:
                m = HEADER_RE.match(row[0].text)
                if m:
                    cur_level = cn_level(m.group(1))
                    continue
            if set(texts) <= COL_LABELS:
                continue  # the literal column-title header row

            l1 = [w.text for w in row if w.x0 < 110 and w.text not in COL_LABELS]
            l2 = [w.text for w in row if 110 <= w.x0 < 300 and w.text not in COL_LABELS]
            l3 = [w.text for w in row if w.x0 >= 300 and w.text not in COL_LABELS]
            rows_data.append({"idx": idx, "level": cur_level, "l1": l1, "l2": l2, "l3": l3})
            idx += 1

    l1_positions = [(r["idx"], r["l1"][0], r["level"]) for r in rows_data if r["l1"]]
    l2_positions = [(r["idx"], r["l2"][0], r["level"]) for r in rows_data if r["l2"]]

    def nearest(positions, i, level):
        cand = [p for p in positions if p[2] == level]
        if not cand:
            return None
        return min(cand, key=lambda p: abs(p[0] - i))[1]

    raw = []
    for r in rows_data:
        if not r["l3"]:
            continue
        l1v = nearest(l1_positions, r["idx"], r["level"])
        l2v = nearest(l2_positions, r["idx"], r["level"])
        for l3v in r["l3"]:
            raw.append({"hskLevel": r["level"], "levelOneName": l1v, "levelTwoName": l2v, "levelThreeName": l3v})

    # dedupe on the Prisma unique key, keep min hskLevel across repeated cumulative listings
    best = {}
    for e in raw:
        key = (e["levelOneName"], e["levelTwoName"], e["levelThreeName"])
        if key not in best or e["hskLevel"] < best[key]["hskLevel"]:
            best[key] = e

    result = list(best.values())
    with open("data/topics.json", "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Raw rows: {len(raw)}, deduped topics: {len(result)}")
    from collections import Counter
    c = Counter(e["hskLevel"] for e in result)
    for k in sorted(c, key=lambda x: (x is None, x)):
        print("level", k, c[k])
    for e in result[:8]:
        print(e)


if __name__ == "__main__":
    main()
