"""Build data/vocab-draft.json from data/vocab-parsed.json.

Every entry gets needsReview=True (CLAUDE.md hard rule: artiId/artiEn are not
in the source PDF, so any translation is AI-drafted and must be reviewed by a
human before scripts/import-vocab.ts is allowed to write it into Card).

Translation coverage in THIS pass: HSK level 1 only (300/10968 words), authored
by hand in scripts/_parse/vocab_translations_l1.py from the assistant's own
Mandarin knowledge (no network/API calls, per the task's constraints). Levels
2-9 (10668 words) are written out with empty artiId/artiEn and a
`translationPending: true` marker rather than being silently dropped, so the
full parsed vocabulary is visible to a reviewer/next pass and the pipeline
doesn't need to re-run the PDF extraction step to pick up more translations
later -- extending scripts/_parse/vocab_translations_l*.py level by level and
re-running this script is enough.
"""
import json

with open("data/vocab-parsed.json", encoding="utf-8") as f:
    entries = json.load(f)

import sys
sys.path.insert(0, "scripts/_parse")
from vocab_translations_l1 import TRANSLATIONS as L1

draft = []
translated = 0
for e in entries:
    tr = L1.get(e["hanzi"]) if e["hskLevel"] == 1 else None
    if tr:
        artiId, artiEn = tr
        translated += 1
    else:
        artiId, artiEn = "", ""
    draft.append({
        "hanzi": e["hanzi"],
        "pinyin": e["pinyin"],
        "artiId": artiId,
        "artiEn": artiEn,
        "hskLevel": e["hskLevel"],
        "extraLevelNote": e["extraLevelNote"],
        "partOfSpeech": e["partOfSpeech"],
        "tipe": e["tipe"],
        "needsReview": True,
        "translationPending": tr is None,
    })

with open("data/vocab-draft.json", "w", encoding="utf-8") as f:
    json.dump(draft, f, ensure_ascii=False, indent=2)

print(f"Total draft entries: {len(draft)}")
print(f"Translated (artiId/artiEn filled): {translated}")
print(f"Translation pending (empty artiId/artiEn, needs a follow-up pass): {len(draft) - translated}")
