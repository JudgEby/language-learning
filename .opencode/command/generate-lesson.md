---
description: Generate or regenerate learning material for a single lesson of a level.
---

Read AGENTS.md, then follow the `generate-lesson-content` skill for lesson `$2`
of level `$1`.

Sources: `content/$1/extract/SB.txt`, `content/$1/extract/WB.txt`.

Create or update:

- `content/$1/data/rules/{NN}-$2.json`
- `content/$1/data/vocabulary/{NN}-$2.json`
- `content/$1/data/phrases/{NN}-$2.json`
- `content/$1/data/idioms/{NN}-$2.json`

Add entries to the manifest `studyOrder` (rule → vocabulary → phrases → idioms
for `$2`) without breaking the order of the other lessons — run
`python scripts/sync_level.py $1`, then `python scripts/validate_level.py $1`.
