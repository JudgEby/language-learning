# AI Agent Instructions — Language Learning

A local language-learning platform organised by level. PDF textbooks are extracted to text,
AI agents generate rules, vocabulary and tests as JSON, and a React app renders the material
and tracks progress in `localStorage`.

This file is the always-on context: JSON schemas, workflows, commands and conventions.
Deeper architecture lives in [`.design/`](.design/) — read only the file mapped to your
task (see [Task → Read Map](#task--read-map)).

## Project structure

```
├── AGENTS.md                 # this file — schemas, workflows, commands
├── .design/                  # modular architecture docs (English)
│   ├── overview.md           # goals, concept, stack, levels
│   ├── architecture.md       # layers, data flow, dependency rules, known inconsistencies
│   ├── content-pipeline.md   # all scripts: CLI, IO, algorithms
│   ├── data-contracts.md     # every JSON schema + TS mirror + invariants
│   ├── ui-structure.md       # routes, pages, components, CSS tokens
│   └── state-and-storage.md  # zustand stores, localStorage, loadContent
├── prompts/
│   ├── rule-generation-style.md       # style contract for rule contentMd (editable)
│   ├── test-plan.example.json         # template for test_plan.json
│   └── grammar-questions.example.json # template for tests/sources/{lessonId}.json
├── toExtract/{LEVEL}/         # input PDFs (SB.pdf, WB.pdf) — gitignored, folders tracked
├── content/{LEVEL}/           # generated content — the real data source
│   ├── manifest.json          # level metadata, study order, test days
│   ├── extract/               # SB.txt, WB.txt — raw text with --- PAGE N --- markers
│   ├── data/
│   │   ├── rules/             # grammar + rules
│   │   ├── vocabulary/        # new words
│   │   ├── phrases/           # phrases and collocations
│   │   └── idioms/            # idioms
│   └── tests/                 # day-01.json, day-02.json, ...
├── scripts/                   # Python CLI utilities
│   ├── content_utils.py              # shared library (no CLI) — paths, I/O, hash, ordering
│   ├── extract_pdf.py               # text-layer PDF → content/{level}/extract/
│   ├── extract_pdf_ocr.py           # OCR for scanned PDFs (Tesseract)
│   ├── sync_level.py                # rebuild studyOrder + data/*/index.json
│   ├── validate_level.py            # validate JSON, ordering, test ids, references
│   ├── fix_test_ids.py              # recompute test question ids
│   ├── generate_vocab_questions.py  # auto-generate vocabulary/phrase questions
│   ├── assemble_tests.py            # assemble day-NN.json from test_plan.json
│   ├── generate_all_tests.py        # hardcoded A2plus day-01..day-30 generator
│   ├── build_rule_md.py             # contentMd template builder (stdout)
│   └── run_app.py                   # sync content → app/public/content, start Vite
└── app/                       # React app (Vite + TypeScript + Zustand)
    └── public/content/        # GENERATED copy of content/ — never edit
```

`{LEVEL}` is a course/level id used as a folder name (latin, no spaces; `B2+` is the
existing exception), e.g. folder `content/B2` ↔ id `B2`.

## Commands

```bash
# app (run from app/)
npm run dev         # Vite dev server on http://localhost:5173
npm run typecheck   # tsc -b for src + tsconfig.node.json for vite.config.ts
npm run build       # typecheck + vite build
npm run preview     # serve the production build

# everything, from repo root
pip install -r requirements.txt
python scripts/run_app.py          # sync content, npm install if needed, npm run dev

# per level (always first argument = level id)
python scripts/extract_pdf.py [LEVEL]
python scripts/extract_pdf_ocr.py [LEVEL]
python scripts/sync_level.py LEVEL
python scripts/validate_level.py LEVEL
python scripts/fix_test_ids.py LEVEL
python scripts/assemble_tests.py LEVEL [--plan PATH]
python scripts/generate_vocab_questions.py LEVEL [--lesson ID] [--count N] [--output PATH]
python scripts/generate_all_tests.py [LEVEL]   # hardcoded A2plus question bank (default LEVEL=A2plus)
python scripts/build_rule_md.py --heading … --essence … --how … --lifehack … [--example EN RU]
```

There are **no** unit-test or lint scripts in `app/package.json`. Verification is
`npm run typecheck` for TypeScript and `python scripts/validate_level.py {LEVEL}` for content.

## Conventions

- **Never edit `app/public/content/`.** It is a generated mirror of `content/`, gitignored,
  and overwritten by `npm run dev`, `npm run build` and `python scripts/run_app.py`.
- **Never rewrite `content/{LEVEL}/extract/`.** It is derived from the PDFs.
- **`manifest.studyOrder` and `data/*/index.json` are derived.** Never hand-edit them —
  run `python scripts/sync_level.py {LEVEL}`.
- **All JSON** uses `ensure_ascii=False`, `indent=2` and a trailing newline (what
  `content_utils.write_json` produces). Preserve it to avoid whole-file diffs.
- Repo documentation, code comments and commit messages are **English**. Content aimed at the
  learner (rule `contentMd`, explanations, example translations, all UI strings) stays in
  the language of instruction — Russian for this project, target language for examples.
- Rule `contentMd` section headings are fixed Russian literals (`Простая суть`, …). Do not
  translate them.

## File naming

- Ordinal prefix: `01-lesson-slug.json`, `02-another-lesson.json`
- `id` inside the JSON is the lesson slug without the prefix: `lesson-slug`
- One file per lesson per category
- Rule ids keep textbook numbering: `1A-my-id`, `me-and-my-language`

## JSON schemas

### manifest.json

```json
{
  "level": "LEVEL_ID",
  "title": "Course title",
  "source": { "sb": "extract/SB.txt", "wb": "extract/WB.txt" },
  "studyOrder": [
    { "type": "rule", "id": "lesson-slug" },
    { "type": "vocabulary", "id": "lesson-slug" },
    { "type": "phrases", "id": "lesson-slug" },
    { "type": "idioms", "id": "lesson-slug" }
  ],
  "testDays": ["day-01", "day-02"]
}
```

`studyOrder` is a **flat** list for the UI: rule → vocabulary → phrases → idioms per lesson,
in textbook order. Progress key in the app: `{type}:{id}` → `rule:lesson-slug`.

### Rule — data/rules/01-lesson-slug.json

```json
{
  "id": "lesson-slug",
  "order": 1,
  "unit": "Unit 1 — Topic",
  "title": "Lesson title",
  "contentMd": "## Grammar topic\n\n### Простая суть\n\n...",
  "examples": ["Example sentence in the target language."]
}
```

- `contentMd` is markdown: explanations in the **language of instruction**, examples in the
  **target language**
- **Style and structure** always follow [`prompts/rule-generation-style.md`](prompts/rule-generation-style.md):
  `Простая суть`, `Как это работает`, `Живые примеры`, `Лайфхак для запоминания`

### Vocabulary — data/vocabulary/01-lesson-slug.json

```json
{
  "lessonId": "lesson-slug",
  "title": "Lesson title — новые слова",
  "items": [
    { "term": "word", "translation": "перевод", "example": "Example sentence." }
  ]
}
```

### Phrases — data/phrases/01-lesson-slug.json

```json
{
  "lessonId": "lesson-slug",
  "title": "Lesson title — фразы",
  "items": [
    { "phrase": "collocation", "translation": "перевод", "example": "Example sentence." }
  ]
}
```

### Idioms — data/idioms/01-lesson-slug.json

```json
{
  "lessonId": "lesson-slug",
  "title": "Lesson title — идиомы",
  "items": [
    { "idiom": "idiom", "translation": "перевод", "example": "Example sentence." }
  ]
}
```

`lessonId` must match an existing rule id, otherwise `validate_level.py` fails.

### Test — tests/day-01.json (array of questions)

```json
[
  {
    "id": "a3f8c2b91e4d",
    "question": "Which sentence is correct?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 1,
    "explanation": "Brief explanation of the correct answer.",
    "relatedRuleIds": ["lesson-slug"]
  }
]
```

- Question and options are in the **target language**
- No more than **4** options
- `explanation` in the target language (a short note in the language of instruction is allowed)
- `relatedRuleIds` lists existing rule ids

### Test id formula

`SHA-256(question + "|" + options.join("|") + "|" + correctIndex)`, first **12** hex chars:

```python
import hashlib

def test_id(question: str, options: list[str], correct_index: int) -> str:
    payload = question + "|" + "|".join(options) + "|" + str(correct_index)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12]
```

The id changes when the question changes, so old `localStorage` progress never blocks a new
test. The id is always derived — never invent it.

## Workflow: "Generate learning material for level {LEVEL}"

1. Read **`prompts/rule-generation-style.md`** — mandatory style for rule `contentMd`
2. Read `content/{LEVEL}/extract/SB.txt` — primary source of grammar and lesson structure
   - *If the file is empty or contains only `--- PAGE N ---` markers, the PDF is scanned. Run
     `python scripts/extract_pdf_ocr.py {LEVEL}` for OCR extraction.*
3. Read `content/{LEVEL}/extract/WB.txt` — additional vocabulary, phrases and idioms
4. Determine the lesson order from the textbook (`order` field drives it)
5. For each lesson create 4 JSON files in `data/rules/`, `data/vocabulary/`, `data/phrases/`,
   `data/idioms/`
6. Update `content/{LEVEL}/manifest.json`:
   - `title` — human-readable course title
   - `studyOrder` — can be rebuilt with `python scripts/sync_level.py {LEVEL}`
7. Do not overwrite `extract/` — only `data/` and `manifest.json`
8. Verify: `python scripts/validate_level.py {LEVEL}`

**Content style:**

- Rules (`contentMd`) strictly per `prompts/rule-generation-style.md`
- Example sentences in rules are in the target language
- Word/phrase translations are in the language of instruction
- Include Workbook material wherever it complements the lesson

## Workflow: "Generate tests for level {LEVEL}, N days"

**Variant A — the agent writes the tests:**

1. Read the rules in `content/{LEVEL}/data/rules/`
2. Plan ~15–20 questions per day (≈1 hour)
3. Create `tests/day-01.json` … `tests/day-NN.json`
4. Each question: ≤4 options, `correctIndex`, `explanation`, `relatedRuleIds`, and `id` per
   the hash formula above
5. Update `manifest.json` → `testDays`
6. Run `python scripts/fix_test_ids.py {LEVEL}` and `python scripts/validate_level.py {LEVEL}`

**Variant B — assemble from a plan plus vocabulary:**

1. Copy `prompts/test-plan.example.json` → `content/{LEVEL}/test_plan.json`
2. Grammar questions (no `id`) → `content/{LEVEL}/tests/sources/{lessonId}.json`
   (see `prompts/grammar-questions.example.json`)
3. `python scripts/assemble_tests.py {LEVEL}` — fills each day with vocabulary/phrase
   questions generated from the level's own lexicon
4. `python scripts/validate_level.py {LEVEL}`

**Question types:** pick the correct sentence, grammar, vocabulary in context, collocations.

## Workflow: "Take the rules from this file"

Always read **`prompts/rule-generation-style.md`** first.

The user may point at a specific source:

- `content/{LEVEL}/extract/SB.txt` — raw textbook text
- `content/{LEVEL}/data/rules/{NN}-{lesson-id}.json` — an already generated rule

Use the named file as the primary source and rewrite the grammar into `contentMd` following
the style prompt.

## Task → Read Map

**IMPORTANT: Read ONLY the specific files mapped to your current task. Never load the entire
`.design/` folder at once.**

| Task | Read in `.design/` | Then read in code |
|---|---|---|
| Orient yourself / what is this project | `overview.md` | `README.md`, `content/index.json` |
| "Content does not load in the app", end-to-end data flow | `architecture.md` | `app/vite.config.ts`, `scripts/run_app.py` |
| Change any Python script (extract / sync / validate / tests) | `content-pipeline.md` | `scripts/content_utils.py` + the target script |
| Add or change a JSON schema field | `data-contracts.md` | `scripts/content_utils.py`, `scripts/validate_level.py`, `app/src/lib/types.ts` |
| Add a page, route or component; change UI copy | `ui-structure.md` | `app/src/App.tsx`, `app/src/pages/`, `app/src/components/` |
| Progress tracking, zustand, `localStorage` keys | `state-and-storage.md` | `app/src/store/`, `app/src/lib/loadContent.ts` |
| Content loading, caching, fetch error handling | `state-and-storage.md` | `app/src/lib/loadContent.ts` |
| Colours, dark theme, CSS tokens | `ui-structure.md` | `app/src/index.css`, `app/src/store/themeStore.ts`, `app/index.html` |
| Change the test id formula | `data-contracts.md` | `scripts/content_utils.py:test_id`, `scripts/fix_test_ids.py`, `scripts/assemble_tests.py:normalize_question` |
| Change the rule markdown structure | `data-contracts.md` | `prompts/rule-generation-style.md`, `scripts/content_utils.py:build_rule_content_md`, `scripts/build_rule_md.py` |
| Add a new level | `content-pipeline.md` | `scripts/extract_pdf.py`, `scripts/sync_level.py` |
| Generate rules / lessons | — (use schemas above) | `prompts/rule-generation-style.md`, `content/{LEVEL}/extract/SB.txt` |
| Generate tests | `data-contracts.md` (test schema + hash) | `prompts/test-plan.example.json`, `scripts/assemble_tests.py` |
| Update documentation | only the mapped `.design/` file(s) | this file, § Docs Hygiene |

## Docs Hygiene

1. **Code is the source of truth.** The implemented code wins. When documentation and code
   disagree, read the code first, then update `.design/` — never "fix" the doc to match a
   stale assumption.
2. After any task that changes architecture, contracts, layers, modules, env or data
   structures, update the **smallest fitting** file in `.design/` and/or this `AGENTS.md`.
   Do not append to an unrelated file.
3. Create a **new** file in `.design/` only when the topic fits none of the existing six, and
   add it to the Task → Read Map in the same change.
4. **Delete** obsolete files and remove them from the Read Map. A stale doc is worse than a
   missing one.
5. Keep `.design/` and this file in **English**. Never mix languages within them.

## Pre-commit documentation check

Before every commit:

1. Read `AGENTS.md` and `README.md`
2. Check they still match reality: project structure, JSON schemas, script list, workflows
3. Fix anything stale (outdated schemas, missing scripts, changed structure)
4. Check `git status`:
   - Files that belong in the commit (new lesson JSON, tests, scripts) → `git add`
   - Obvious junk (temp logs, drafts, dumps) → do not add
   - Temporary or garbage files → delete
5. Write a concise **English** commit message describing the substance of the change
6. Only then commit

## Cleanup

After finishing a task, delete temporary files (scripts, drafts, test files) that are not
part of the project. Leave no litter.

## Before finishing

Run `python scripts/validate_level.py {LEVEL}` (or check manually):

- [ ] All JSON is valid
- [ ] `id` inside files matches filenames and `studyOrder`
- [ ] `studyOrder` reflects textbook order (`sync_level.py` if needed)
- [ ] Every test id is computed with the hash formula (`fix_test_ids.py` if needed)
- [ ] No question has more than 4 options
- [ ] `relatedRuleIds` reference existing rules
- [ ] `npm run typecheck` passes if `app/src` was touched
- [ ] `.design/` and `AGENTS.md` reflect any architectural change
