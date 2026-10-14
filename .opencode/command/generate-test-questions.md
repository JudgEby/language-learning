---
description: Generate test questions for specific rules of a level.
---

Read AGENTS.md, then follow the `generate-tests` skill (Variant A) for level `$1`
covering the rules listed in `$2` (rule JSON files under `content/$1/data/rules/`).

Add the questions to `content/$1/tests/day-01.json` (or create `day-02.json` if
`day-01` is already full). Every question carries `relatedRuleIds`, a hash-based
`id`, and at most 4 options. Update `testDays` in `manifest.json`, then run
`fix_test_ids.py` and `validate_level.py` for `$1`.
