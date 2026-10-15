---
name: generate-mnemonics
description: Generate phonetic keyword-method associations (keyword + mnemonic image) for lexicon items. Use when filling keyword/mnemonic fields in data/vocabulary, data/phrases, data/idioms, backfilling mnemonics for a level, or working with flashcard associations.
---

# Generate Mnemonics

Adds phonetic associations to lexicon items under
`content/{LEVEL}/data/{vocabulary,phrases,idioms}/` using the keyword method:
a Russian word consonant with the foreign term plus a vivid mental image
linking that sound to the meaning.

## Workflow

1. Read the target lexicon file (`NN-slug.json`). Note each item's foreign text
   (`term` / `phrase` / `idiom`), `translation`, and `example`.
2. For every item write `keyword` and `mnemonic` (shape below; see
   `references/mnemonic-item.example.json`).
3. Keep every other field byte-identical; do not reorder items.
4. Run `python scripts/validate_level.py {LEVEL}`.

Backfilling a whole level means repeating this per file in
`data/vocabulary/`, `data/phrases/`, and `data/idioms/`. Work file by file so
a failure stays isolated.

## Keyword style

Write as a witty memory coach: the association must be instant, funny, and
impossible to confuse. Learner-facing text stays Russian.

- `keyword` — 1-2 Russian words that sound like the foreign term (or its
  stressed part). Sound-alikeness beats meaning; never reuse the translation
  itself. For phrases/idioms use the stressed anchor word of the phrase.
- `mnemonic` — 1-2 sentences: a vivid, slightly absurd scene where the
  `keyword` meets the `translation`. Name both explicitly so the link is
  unambiguous. No new vocabulary, no grammar explanations.
- If no decent consonance exists, leave both fields out rather than forcing a
  weak match — a bad association is worse than none.
- Never touch `term`/`phrase`/`idiom`, `translation`, or `example`.

## Contracts

- Fields are optional: `keyword?: string`, `mnemonic?: string`. When present,
  both must be non-empty; `validate_level.py` asserts the pair.
- JSON formatting: `ensure_ascii=False`, `indent=2`, trailing newline.
- Schemas: `docs/architecture/data-contracts.md`. Never edit
  `app/public/content/` or `content/{LEVEL}/extract/`.
