# Architecture

## Layering

The system is a straight-line pipeline with no runtime services. Four layers:

```
 L0  Source          toExtract/{LEVEL}/{SB,WB}.pdf          (gitignored input)
 L1  Extraction      content/{LEVEL}/extract/{SB,WB}.txt    (page-marked plain text)
 L2  Content         content/{LEVEL}/manifest.json          (authoritative data)
                     content/{LEVEL}/data/<category>/*.json
                     content/{LEVEL}/tests/day-NN.json
 L3  Delivery        app/public/content/**                  (generated copy, gitignored)
 L4  Presentation    app/src/**                             (React SPA)
```

Each layer only writes into the next one. L2 is the single source of truth; L3 is a
byte-for-byte mirror produced by tooling and must never be edited by hand.

## L0 → L1: PDF to text

`scripts/extract_pdf.py` (text-layer PDFs) and `scripts/extract_pdf_ocr.py` (scanned PDFs)
both write `--- PAGE N ---` markers between pages. The markers are load-bearing: the
presence of *only* markers in the `.txt` is the signal that the PDF was scanned and OCR is
required. `extract_pdf_ocr.py` also creates the level skeleton (`data/*/`, `tests/`,
`manifest.json`) when it is absent, deriving `source` from the `.txt` files already present.

Both scripts rewrite `content/index.json` at the end.

## L1 → L2: text to JSON (agent-driven)

This transition is **not automated** — an AI agent performs it, following the schemas and
workflows in `AGENTS.md` and the style contract in `prompts/rule-generation-style.md`. The
agent writes lesson files and `manifest.json`; `scripts/sync_level.py` then normalises the
derived artefacts.

## L2 derivation: rules are the spine

Ordering is never inferred from filenames at read time. `scripts/content_utils.py` derives
everything from the rules directory:

1. `load_rules_ordered(level)` sorts rule files by `(data["order"], filename)`.
2. `build_study_order(level)` walks that ordered rule list and, for each rule, emits
   `{type, id}` for rule → vocabulary → phrases → idioms, **only for files that exist**.
   The result is the flat `manifest.studyOrder` consumed by the UI.
3. `build_category_index(category)` produces the ordered filename list written to
   `content/{LEVEL}/data/<category>/index.json`.
4. `update_content_index()` regenerates `content/index.json` from every `content/` directory
   that has a `manifest.json`.

Consequence: a lesson with a rule but no phrases file simply contributes three entries.
Categories that are missing for a lesson are absent from `studyOrder` — there are no empty
placeholders.

## L2 → L3: mirror to the app

Two mechanisms perform the same copy, both rooted at `app/vite.config.ts`:

- `content-sync` plugin (`apply: 'serve'`) — full `rmSync` + `cpSync` on dev-server start,
  then adds `content/` to the Vite watcher and incrementally mirrors `add` / `change` /
  `unlink` / `unlinkDir`, sending a `full-reload` WebSocket message after each event.
- `content-sync-build` plugin (`apply: 'build'`) — the same full copy in `buildStart`, so a
  production bundle always ships current content.
- `scripts/run_app.py` — a third, independent copy step (`shutil.rmtree` + `copytree`) used
  when the app is launched through Python.

All three are destructive full replaces of `app/public/content/`. The directory is listed in
`.gitignore`.

## L3 → L4: fetch at runtime

The SPA has **no bundler-time knowledge of content**. Every read is a `fetch` against the
static base `/content` (see `app/src/lib/loadContent.ts`):

```
/content/index.json
/content/{level}/manifest.json
/content/{level}/data/{category}/index.json     → filename for a lessonId
/content/{level}/data/{category}/{file}         → lesson payload
/content/{level}/tests/{dayId}.json
```

The `index.json` hop is the only indirection: it maps `lessonId` → `NN-slug.json` so the
filename prefix never has to be guessed by the client. Matching is exact-suffix first, then
a loose `includes` fallback.

## Dependency rules

| Layer | May import / call | Must never |
|---|---|---|
| `app/src/pages`, `app/src/components` | `app/src/lib/*`, `app/src/store/*`, other components | import from `scripts/`, read `content/` via Node APIs, hardcode a lesson filename |
| `app/src/lib/*` | types only (`lib/types.ts`) | import stores or components |
| `app/src/store/*` | `lib/types.ts` | import pages or components |
| `scripts/*` | `scripts/content_utils.py`, stdlib | import anything from `app/` |
| `app/vite.config.ts` | Node `fs`/`path`/`url`, plugin APIs | read content through the app's own loaders |

TypeScript boundaries are additionally enforced by `npm run typecheck`, which builds both
tsconfig projects (`src` and `vite.config.ts`).

## Progress side-channel

The only mutable state is in the browser: `localStorage` keys `language-learning-progress`
and `language-learning-theme`. Content itself is never written by the app — read-only at
runtime. Full details in [`state-and-storage.md`](state-and-storage.md).

## Design decisions and known limitations

Behaviours that look like defects but are deliberate, plus the limits that remain.

**Deliberate**

- `TestViewPage` marks a question complete on **confirm**, regardless of whether the answer
  was correct. Progress means "answered", not "correct", so `completedTests` must never be
  read as a score.
- `content/A2` is a stub level: extract text plus four empty `data/*/index.json` files and
  an empty `studyOrder` / `testDays`. It validates cleanly and renders the "no materials"
  state via the `hasStudy` / `hasTests` flags, so a level can be prepared before any content
  is generated for it.
- `scripts/generate_all_tests.py` contains a hand-authored question bank. Only the output
  target is parameterised (`--level`, default `A2plus`) — the questions themselves are
  level-specific and must be rewritten, not reused, for another level.
- `app/src/lib/loadContent.ts` caches every content payload in memory for the page session.
  This is safe because content cannot change under a live page: in dev the `content-sync`
  Vite plugin (`app/vite.config.ts`, `apply: 'serve'`) forces a full reload on any
  `content/` change, and a production build freezes content into `dist/` at build time.

**Remaining limitations**

- `RulesListPage` still fetches one payload per `studyOrder` entry to resolve list titles
  (only the category `index.json` lookups are deduped by the cache). `TestsListPage` fetches
  every day file up front because it renders the question text inline. Both are correct but
  not lazy; a summary index would be the fix, which is a content-contract change.
- `scripts/generate_all_tests.py` is not covered by `validate_level.py`'s expectations
  beyond the test files it writes, and its 30-day bank cannot be regenerated for a level
  whose `relatedRuleIds` do not exist — `assemble_tests.py` is the generic path.
- `scripts/extract_pdf_ocr.py` hardcodes OCR `lang="eng"` and calls `sys.exit(1)` at import
  time when Tesseract is missing, so the module cannot be imported for testing or reuse.
- `list_data_files` re-reads and re-parses every lesson file on each call, which makes
  `build_study_order` O(rules x categories x files) — fine at current sizes, slow for a
  level with hundreds of lessons.
