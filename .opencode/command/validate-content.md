---
description: Check a level's content against schemas and fix mismatches.
---

Read AGENTS.md and check `content/$1/`:

- all JSON is valid and matches the schemas in `docs/architecture/data-contracts.md`
- `studyOrder` in `manifest.json` matches the files in `data/`
- test ids follow the hash formula
- `index.json` files are current in every `data/` subfolder

Fix any mismatches with `sync_level.py` (derived artefacts) and `fix_test_ids.py`
(derived ids), then re-run `python scripts/validate_level.py $1` until it passes.
