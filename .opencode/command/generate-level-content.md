---
description: Generate full learning material (rules, vocabulary, phrases, idioms) for a level.
---

Read AGENTS.md, then follow the `generate-lesson-content` skill for level `$1`.

Sources:

- `content/$1/extract/SB.txt` — grammar and lesson structure
- `content/$1/extract/WB.txt` — extra Workbook vocabulary

Produce:

1. JSON files for all lessons in `content/$1/data/rules/`, `vocabulary/`, `phrases/`, `idioms/`
2. `index.json` in each `data/` subfolder (via `sync_level.py`, never by hand)
3. Update `content/$1/manifest.json`: `title` is the human-readable course name,
   `studyOrder` is the flat list (rule → vocabulary → phrases → idioms per lesson)

For large books generate unit by unit, not everything at once. Afterwards run
`python scripts/run_app.py` and check the material in the app.
