---
description: Generate daily tests for a level (about 15-20 questions per day).
---

Read AGENTS.md, then follow the `generate-tests` skill for level `$1` for `$2` days
of 1 hour each.

Rule source: `content/$1/data/rules/`.

Produce:

1. Files `content/$1/tests/day-01.json` … `day-$2.json`
2. In every question: up to 4 options (target language), `explanation`,
   `relatedRuleIds`, hash-based `id` (never invented — run `fix_test_ids.py`)
3. Update `testDays` in `manifest.json`

Questions in the target language. Types: grammar, correct-sentence choice,
vocabulary in context, collocations.
