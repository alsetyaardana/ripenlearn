"""Common bbox XML parsing helpers for HSK 3.0 syllabus extraction.

Not a Prisma import script itself -- this is a shared library used by the
one-off `scripts/_parse/parse_*.py` extraction scripts, which turn
`data/hsk_bbox.xml` (produced by `pdftotext -bbox-layout`) into clean
intermediate JSON files under `data/`. The actual `scripts/import-*.ts`
scripts then just read that JSON and upsert into Postgres via Prisma -- see
the comment block at the top of each import-*.ts for the exact regeneration
command.

Watermark filtering: the source PDF has a repeating diagonal watermark made of
the characters 国/际/汉/考, individually tiled across every page. In
-bbox-layout output these watermark glyphs are rendered as huge word bounding
boxes (~40-90pt tall) compared to real table/prose text (~10-15pt tall). We
filter purely on that structural signal (word text is exactly one of
国/际/汉/考 AND its box height is abnormally large) rather than blindly
stripping those characters, so real content that legitimately uses
国/际/汉/考 (e.g. 中国, 国际, 汉语, 考试...) is preserved.
"""
import xml.etree.ElementTree as ET

WATERMARK_CHARS = {"国", "际", "汉", "考"}
WATERMARK_HEIGHT_THRESHOLD = 20.0  # pt; real body text is ~10-15pt tall


def local(tag):
    return tag.split('}')[-1]


class Word:
    __slots__ = ("text", "x0", "y0", "x1", "y1")

    def __init__(self, text, x0, y0, x1, y1):
        self.text = text
        self.x0 = x0
        self.y0 = y0
        self.x1 = x1
        self.y1 = y1

    @property
    def height(self):
        return self.y1 - self.y0

    @property
    def xc(self):
        return (self.x0 + self.x1) / 2

    @property
    def yc(self):
        return (self.y0 + self.y1) / 2

    def __repr__(self):
        return f"Word({self.text!r},{self.x0:.1f},{self.y0:.1f})"


def is_watermark(word):
    return word.text in WATERMARK_CHARS and word.height > WATERMARK_HEIGHT_THRESHOLD


def load_pages(path):
    """Returns list of pages (index 0 == PDF page 1); each page is a list of Word."""
    tree = ET.parse(path)
    root = tree.getroot()
    pages = []
    for page_el in root.iter():
        if local(page_el.tag) != 'page':
            continue
        words = []
        for el in page_el.iter():
            if local(el.tag) != 'word':
                continue
            text = ''.join(el.itertext())
            if not text.strip():
                continue
            x0 = float(el.get('xMin'))
            y0 = float(el.get('yMin'))
            x1 = float(el.get('xMax'))
            y1 = float(el.get('yMax'))
            w = Word(text, x0, y0, x1, y1)
            if is_watermark(w):
                continue
            words.append(w)
        pages.append(words)
    return pages


def cluster_rows(words, y_tol=4.0):
    """Cluster words into rows by y-center proximity. Returns list of rows,
    each row a list of Word sorted by x0, rows sorted by y."""
    ws = sorted(words, key=lambda w: w.yc)
    rows = []
    cur = []
    cur_y = None
    for w in ws:
        if cur_y is None or abs(w.yc - cur_y) <= y_tol:
            cur.append(w)
            cur_y = sum(x.yc for x in cur) / len(cur)
        else:
            rows.append(cur)
            cur = [w]
            cur_y = w.yc
    if cur:
        rows.append(cur)
    for r in rows:
        r.sort(key=lambda w: w.x0)
    return rows
