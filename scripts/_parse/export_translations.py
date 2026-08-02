"""Export scripts/_parse/vocab_translations_l{N}.py TRANSLATIONS dicts to
data/vocab-translations-l{N}.json, for scripts/import-vocab.ts to consume.

No network/API calls -- pure local re-serialization of the hand-authored
lookup tables. Run after editing any vocab_translations_lN.py file, then
re-run `npx tsx scripts/import-vocab.ts` to regenerate data/vocab-draft.json.
"""
import importlib
import json
import os
import sys

sys.path.insert(0, "scripts/_parse")

DATA_DIR = "data"

for level in range(1, 10):
    mod_name = f"vocab_translations_l{level}"
    mod_path = os.path.join("scripts", "_parse", f"{mod_name}.py")
    if not os.path.exists(mod_path):
        continue
    mod = importlib.import_module(mod_name)
    out_path = os.path.join(DATA_DIR, f"vocab-translations-l{level}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(mod.TRANSLATIONS, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path}: {len(mod.TRANSLATIONS)} entries")
