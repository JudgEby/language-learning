---
name: generate-lesson-content
description: Generate or regenerate lesson JSON (rules, vocabulary, phrases, idioms) for a level. Use when writing rule contentMd, adding a lesson, or working with data/rules, studyOrder, and contentMd style.
---

# Generate Lesson Content

Produces one JSON file per lesson per category under `content/{LEVEL}/data/`
(`NN-slug.json`, `id`/`lessonId` = slug without the ordinal prefix).

## Workflow

1. Read `content/{LEVEL}/extract/SB.txt` (grammar, lesson order). If it holds only
   `--- PAGE N ---` markers, the PDF is scanned — run `extract_pdf_ocr.py {LEVEL}` first.
2. Read `content/{LEVEL}/extract/WB.txt` (extra vocabulary, phrases, idioms).
3. Write files into `data/rules|vocabulary|phrases|idioms/`.
4. Run `python scripts/sync_level.py {LEVEL}` (rebuilds `studyOrder`, `index.json`),
   then `python scripts/validate_level.py {LEVEL}`.

## Rule style (`contentMd`)

Write as an experienced, friendly teacher: simple words, no academic overload.
Every rule keeps exactly this shape — `##` lesson heading, then four sections
with these fixed Russian literals (do not translate or rename them):

### Простая суть

Explain the rule in a few sentences in the language of instruction. Use vivid
analogies and metaphors where fitting.

### Как это работает

A short, memorable formula or time markers.

### Живые примеры

3-4 vivid real-life examples (colloquial speech, shows, everyday situations)
in the target language with translations. Bold key elements with **bold**.

### Лайфхак для запоминания

A mnemonic, association, or tip for not confusing this rule with similar ones.

Mapping into JSON:

- `contentMd` — markdown in the language of instruction; examples inside it in
  the target language (translation in brackets or on a separate line).
- `examples` — 2-4 key target-language sentences from the examples section
  (no translations).
- Lexicon/phrase/idiom files: translations in the language of instruction,
  examples in the target language.

## Contracts

- JSON formatting: `ensure_ascii=False`, `indent=2`, trailing newline.
- Never hand-edit `manifest.studyOrder` or `data/*/index.json` — they are derived.
- Never edit `app/public/content/` (generated mirror) or `content/{LEVEL}/extract/`.
- Schemas: `docs/architecture/data-contracts.md`. Scripts: `scripts/build_rule_md.py`
  assembles `contentMd` from the same four sections.
