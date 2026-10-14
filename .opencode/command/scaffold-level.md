---
description: Scaffold a new level from scratch (extract assumed done).
---

Read AGENTS.md. For level `$1`:

1. Assume extraction is done (`content/$1/extract/SB.txt`, `WB.txt`)
2. Follow the `generate-lesson-content` skill for the full material, then the
   `generate-tests` skill for 5 test days
3. Create `content/index.json` with level `$1` if it is not listed yet
   (`sync_level.py` handles this)

Verify with `python scripts/validate_level.py $1`.
