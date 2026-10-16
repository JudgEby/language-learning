---
name: generate-tests
description: Generate test days and questions for a level. Use when writing tests/day-NN.json, planning test days, using assemble_tests.py, test_plan.json, grammar-question sources, or relatedRuleIds.
---

# Generate Tests

Produces `content/{LEVEL}/tests/day-01.json …` (~15-20 questions per day) and
updates `manifest.json` → `testDays`.

## Variant A — hand-written days

1. Read the rules in `content/{LEVEL}/data/rules/`; plan ~15-20 questions per day.
2. Write `tests/day-01.json` … Question shape: `question`, `options` (1-4 entries,
   target language), `correctIndex`, `explanation`, `relatedRuleIds` — and no `id`
   (it is derived, see below).
3. Update `manifest.json` → `testDays`; run `fix_test_ids.py` then `validate_level.py`.

## Variant B — plan + auto vocabulary

1. Copy `references/test-plan.example.json` → `content/{LEVEL}/test_plan.json` and
   fill the lesson groups.
2. Put hand-written grammar pools in `content/{LEVEL}/tests/sources/{lessonId}.json`
   shaped as `references/grammar-questions.example.json` (also no `id`).
3. Run `python scripts/assemble_tests.py {LEVEL}`, then `validate_level.py`.

## Contracts

- Question `id` is derived, never invented:
  `sha256(question + "|" + options.join("|") + "|" + correctIndex)`, first 12 hex
  chars (`content_utils.test_id`). After hand edits run `fix_test_ids.py`.
- Every `relatedRuleIds` entry must match an existing rule id.
- Questions in the target language; a short note in the language of instruction
  is allowed inside `explanation`.
- JSON formatting: `ensure_ascii=False`, `indent=2`, trailing newline.
- Schemas: `docs/architecture/data-contracts.md`. Never edit `app/public/content/`.
