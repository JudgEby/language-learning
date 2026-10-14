# AI Agent Instructions — Language Learning

A local language-learning platform organised by level. PDF textbooks are extracted to text,
AI agents generate rules, vocabulary and tests as JSON (`content/{LEVEL}/`), and a React app
(`app/`, Vite + TypeScript + Zustand) renders the material and tracks progress in
`localStorage`. There is no server and no database.

## Ticket First

- Tickets live in GitHub Issues on `JudgEby/language-learning`; work with them via `gh`.
  Check access with a read (`gh issue list`) before the first write.
- Main rule: if a person describes a task, the result is a ticket, and implementation waits
  for a separate explicit "do it".
- "X is broken" / "we should Y" / long description with no command verb → draft a ticket
  and stop ("ready to take it if you say so"). "Do X" / "fix it" / "take ticket N" →
  implement. "Look at ticket N" → analyse without edits, report back.
- Nothing is written to the tracker without an explicit "yes" on a shown draft — except
  `status:progress`, set the moment assigned work starts.
- Everything that outlives a session becomes a ticket, not a code TODO or markdown note.
- Labels: one `type:` (bug/proposal/debt/ops), one `area:` (content/app/scripts/docs), one
  `status:` (ready/progress/blocked/deferred/wontdo); `priority:` (high/low) when it matters.
- Details: `docs/architecture/ticket-workflow.md`.

## Project structure

```
├── AGENTS.md                 # this file — workflows, commands, Read Map
├── docs/architecture/        # architecture docs (English) — see Read Map
├── prompts/                  # rule style, test-plan and grammar-question templates
├── toExtract/{LEVEL}/        # input PDFs (SB.pdf, WB.pdf) — gitignored, folders tracked
├── content/{LEVEL}/          # generated content — the real data source
│   ├── manifest.json          # level metadata, study order, test days
│   ├── extract/               # SB.txt, WB.txt — raw text with --- PAGE N --- markers
│   ├── data/                  # rules/, vocabulary/, phrases/, idioms/
│   └── tests/                 # day-01.json, day-02.json, ...
├── scripts/                   # Python CLI utilities (content_utils.py + 10 scripts)
└── app/                       # React SPA (reads the generated app/public/content/)
```

`{LEVEL}` is a latin-only folder name (`A2`, `A2+`, `B1`, `B2`, `B2+`), used verbatim as the
level id, display name, and URL segment. Full layout, stack and levels:
`docs/architecture/overview.md`.

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

# per level (first argument = level id)
python scripts/extract_pdf.py [LEVEL]        # text-layer PDFs -> extract/
python scripts/extract_pdf_ocr.py [LEVEL]    # OCR for scanned PDFs
python scripts/sync_level.py LEVEL           # rebuild studyOrder + data/*/index.json
python scripts/validate_level.py LEVEL       # validate JSON, ordering, test ids
python scripts/fix_test_ids.py LEVEL         # recompute test question ids
python scripts/assemble_tests.py LEVEL [--plan PATH]   # build day-NN.json
python scripts/generate_vocab_questions.py LEVEL [--lesson ID] [--count N]
```

There are no unit-test or lint scripts. Verification is `npm run typecheck` for
TypeScript and `python scripts/validate_level.py {LEVEL}` for content. Every script is
documented in `docs/architecture/content-pipeline.md`.

## Conventions

- **Never edit `app/public/content/`.** Generated mirror of `content/`, gitignored,
  overwritten by dev/build/`run_app.py`.
- **Never rewrite `content/{LEVEL}/extract/`.** Derived from the PDFs.
- **`manifest.studyOrder` and `data/*/index.json` are derived.** Never hand-edit —
  run `python scripts/sync_level.py {LEVEL}`.
- **Test question ids are derived** (SHA-256 hash, see `docs/architecture/data-contracts.md`).
  Never invent one; run `fix_test_ids.py` after hand edits.
- **All JSON** uses `ensure_ascii=False`, `indent=2` and a trailing newline. Preserve it.
- Task branches grow from `develop`; releases merge `develop` into `main`.
- Repo documentation, code comments and commit messages are **English**. Learner-facing
  content (rule `contentMd`, translations, UI strings) is Russian; rule section headings are
  fixed Russian literals — do not translate them.
- Rule `contentMd` always follows `prompts/rule-generation-style.md`. JSON schemas for every
  file: `docs/architecture/data-contracts.md`.

## Workflow: generate learning material for level {LEVEL}

1. Read `prompts/rule-generation-style.md` (mandatory style for rule `contentMd`).
2. Read `content/{LEVEL}/extract/SB.txt` (grammar, lesson order); if it holds only
   `--- PAGE N ---` markers, the PDF is scanned — run `extract_pdf_ocr.py {LEVEL}`.
3. Read `content/{LEVEL}/extract/WB.txt` (extra vocabulary, phrases, idioms).
4. Write one file per lesson per category into `data/rules|vocabulary|phrases|idioms/`
   (`NN-slug.json`, `id`/`lessonId` = slug without prefix).
5. Run `python scripts/sync_level.py {LEVEL}` (rebuilds `studyOrder`, `index.json`),
   then `python scripts/validate_level.py {LEVEL}`.

## Workflow: generate tests for level {LEVEL}, N days

1. Read the rules in `content/{LEVEL}/data/rules/`; plan ~15–20 questions per day.
2. Write `tests/day-01.json` … (≤4 options, `correctIndex`, `explanation`,
   `relatedRuleIds`; no `id` — it is derived, see `data-contracts.md`).
3. Update `manifest.json` → `testDays`; run `fix_test_ids.py` then `validate_level.py`.
4. Variant B (plan + auto vocabulary): copy `prompts/test-plan.example.json` →
   `content/{LEVEL}/test_plan.json`, put grammar pools in `tests/sources/{lessonId}.json`
   (`prompts/grammar-questions.example.json`), run `assemble_tests.py`.

## Gotchas

- On Windows, renaming a level folder fails with `Permission denied` while `npm run dev`
  runs — the `content-sync` watcher holds a handle on `content/`. Stop the dev server first.
- Renaming a level id orphans its saved progress: same change must add `[oldId, newId]` to
  `LEVEL_RENAMES` in `app/src/store/progressStore.ts` and bump `PROGRESS_VERSION`.
- `validate_level.py` does not check filename↔`id` equality; a mismatch surfaces only as a
  `findDataFile` failure in the browser.
- In the app, test progress means "answered", not "correct" — never read it as a score.
- `extract_pdf_ocr.py` hardcodes OCR `lang="eng"` and exits at import time without Tesseract.
- `generate_all_tests.py` holds a hand-authored bank for `A2+` only; other levels use
  `assemble_tests.py`.

## Task → Read Map

IMPORTANT: Start with the files mapped to your current task. If they are not enough, read
the code they point to — never load the entire `docs/architecture/` folder at once.

| Task | Read in `docs/architecture/` | Start in code | Verify with |
|---|---|---|---|
| Generate lesson content | `data-contracts.md`, `content-pipeline.md` | `prompts/rule-generation-style.md`, `content/{LEVEL}/extract/` | `sync_level.py {LEVEL}`, `validate_level.py {LEVEL}` |
| Generate tests | `data-contracts.md` | `content/{LEVEL}/data/rules/`, `scripts/assemble_tests.py` | `fix_test_ids.py {LEVEL}`, `validate_level.py {LEVEL}` |
| Change a pipeline script | `content-pipeline.md` | `scripts/content_utils.py` + target script | `validate_level.py` for an affected level |
| Change a JSON schema field | `data-contracts.md` | `scripts/validate_level.py`, `app/src/lib/types.ts` | `validate_level.py {LEVEL}`, `npm run typecheck` |
| Add page, route, component; change UI copy | `ui-structure.md` | `app/src/App.tsx`, `app/src/pages/`, `app/src/components/` | `npm run typecheck` |
| Colours, dark theme, CSS tokens | `ui-structure.md` | `app/src/index.css`, `app/src/store/themeStore.ts` | `npm run typecheck` |
| Progress tracking, `localStorage` keys | `state-and-storage.md` | `app/src/store/`, `app/src/lib/loadContent.ts` | `npm run typecheck` |
| Content loading, caching, fetch errors | `state-and-storage.md` | `app/src/lib/loadContent.ts` | `npm run dev`, browser console |
| Content does not load in the app | `architecture.md` | `app/vite.config.ts`, `scripts/run_app.py` | `npm run dev` |
| Add a new level | `overview.md`, `content-pipeline.md` | `scripts/extract_pdf.py`, `scripts/sync_level.py` | `validate_level.py {LEVEL}` |
| File a bug or feature ticket | `ticket-workflow.md` | — | re-read the created ticket |
| Take a ticket, finish and close it | `ticket-workflow.md` | paths named in the ticket | checks named in the ticket |
| Anything not listed above | `overview.md` | — | — |

## Docs Hygiene

1. **Code is the source of truth.** On mismatch, read the code first, then update
   `docs/architecture/` — never the other way round.
2. After tasks changing architecture, contracts, layers, modules, env or data structures,
   update the smallest fitting file in `docs/architecture/` and/or this file. The file to
   update is visible in its `Covers:` line. Tracker, taxonomy, or branch-agreement changes →
   `ticket-workflow.md`.
3. Create a new file in `docs/architecture/` only when the topic fits none of the existing
   files, and add it to the Read Map in the same change.
4. Never delete an obsolete file silently: propose deletion in the task report first, then
   remove it from the Read Map.
5. **Definition of done:** before finishing any task, match changed code files against
   `Covers:` lines and the Read Map; update affected descriptions or confirm they still hold.
6. Before every commit, re-read this file and `README.md`; fix anything stale, stage only
   intended files, delete litter, and write a concise **English** commit message. Never
   commit in this architecture run — the human reviews and commits.
