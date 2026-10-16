# Overview

Covers: `requirements.txt`, `app/package.json`, `content/`, `content/index.json`, `toExtract/`, `.opencode/`
Read when: orienting in the repository, adding a new level, checking stack versions or bundled levels.

## What this project is

A local, single-user language-learning platform. Course material lives in JSON files on
disk; a React single-page app renders them and tracks the learner's progress in the
browser. There is no server, no database, and no network calls to third parties.

The distinguishing idea is that **the content is generated, not authored**: PDF course
books are extracted to plain text, an AI agent turns that text into structured JSON
(grammar explanations, vocabulary, phrases, idioms, test questions), and the app treats
those JSON files as its database.

## Goals

- Turn PDF textbooks (Student's Book + Workbook) into structured, machine-checkable JSON.
- Present a flat, textbook-ordered study path: rule → vocabulary → phrases → idioms.
- Run daily multiple-choice tests with immediate feedback and rule lookup.
- Review vocabulary with SM-2 flashcards (Ebbinghaus curve) using keyword-method
  phonetic associations stored on the lexicon items.
- Remember progress across sessions with zero infrastructure.
- Keep every content transformation scriptable, deterministic, and re-runnable.

## Non-goals

- No user accounts, no sync between devices, no server-side persistence.
- No authoring UI: content changes are made by editing JSON and re-running scripts.
- No persistent grading, scoring, or adaptive difficulty (the game shows an ephemeral
  per-session "first try" count that is never stored).
- No streaming audio, no media assets beyond SVG logos. Pronunciation playback
  uses the browser's built-in speech synthesis (Web Speech API) with OS-native
  voices — local synthesis, no audio files and no network calls.

## Stack

### Content pipeline — Python 3.10+

| Dependency | Used by | Purpose |
|---|---|---|
| `pypdf` | `scripts/extract_pdf.py` | text extraction from text-layer PDFs |
| `PyMuPDF` (`fitz`) | `scripts/extract_pdf_ocr.py` | page rasterisation for OCR |
| `pytesseract` + Tesseract OCR | `scripts/extract_pdf_ocr.py` | OCR for scanned PDFs |
| `Pillow` | `scripts/extract_pdf_ocr.py` | image wrapper for `pytesseract` |

Everything else in `scripts/` is **stdlib-only** (`hashlib`, `json`, `pathlib`, `argparse`,
`shutil`, `subprocess`, `random`). Only the two extractors have third-party requirements.

### Frontend — `app/`

| Package | Version | Role |
|---|---|---|
| `react`, `react-dom` | ^19 | UI |
| `react-router-dom` | ^7.1 | routing |
| `zustand` | ^5 | progress + theme stores, with `persist` middleware |
| `react-markdown` + `remark-gfm` | ^9 / ^4 | renders rule `contentMd` (GFM tables) |
| `vite` + `@vitejs/plugin-react` | ^6 | dev server, bundler, custom content-sync plugins |
| `vite-plugin-pwa` | ^2 | service worker (Workbox `generateSW`): precached app shell + `CacheFirst` for `/content/**`, `registerType: 'prompt'` |
| `typescript` | ~5.7 | `tsc -b` typecheck |

Styling is a **single plain CSS file** (`app/src/index.css`, ~810 lines) with CSS custom
properties for theming. No Tailwind, no CSS modules, no preprocessor.

## Repository layout

```
├── AGENTS.md              # AI-agent instructions: workflows, commands, Read Map
├── docs/architecture/     # this folder — modular architecture docs (English)
├── .opencode/skills/     # versioned agent skills (lesson content, tests)
├── .opencode/command/    # slash commands for the generation workflows
├── toExtract/{LEVEL}/     # input PDFs (SB.pdf, WB.pdf) — gitignored, folders tracked
├── content/               # generated content — the app's real data source
│   ├── index.json         # list of level ids
│   └── {LEVEL}/           # manifest.json, extract/, data/, tests/
├── scripts/               # Python CLI utilities (10 scripts + content_utils.py)
└── app/                   # Vite + React + TS SPA (reads app/public/content/)
```

## Bundled levels

`content/index.json` currently lists five levels:

| Level id | Notes |
|---|---|
| `A2` | 36 lessons, 12 test days |
| `A2+` | 36 lessons, 30 test days, ~300 vocabulary items |
| `B1` | 32 lessons, 30 test days |
| `B2` | 32 lessons (ids like `1a-my-id`), 6 test days |
| `B2+` | 32 rules, 27 vocabulary / 2 phrases / 3 idioms files, 30 test days |

Level ids are latin-only folder names with no spaces, plus `+` for half-levels (`A2+`,
`B2+`). The id is used verbatim in URLs.

**A level id is also its display name.** `manifest.title` must equal the level id, so the
home page shows `A2`, `A2+`, `B1`, `B2`, `B2+` and nothing else; `validate_manifest`
enforces it. The textbook series ("Speakout") lives only in `extract/` and in git history —
it is deliberately kept out of the UI. Renaming a level id orphans its `localStorage`
progress, so add an entry to `LEVEL_RENAMES` in `app/src/store/progressStore.ts` and bump
`PROGRESS_VERSION` in the same change.

## Running the project

```bash
pip install -r requirements.txt     # Python deps (extractors only)
python scripts/run_app.py          # sync content -> app/public/content, npm install, vite dev
```

`python scripts/run_app.py` is the intended entry point: it wipes and re-copies
`content/` into `app/public/content/`, installs npm dependencies only if `app/node_modules`
is missing, then runs `npm run dev`. The app is served on `http://localhost:5173`.

Plain Vite also works (`cd app && npm run dev`) because the `content-sync` plugin performs
the copy itself.

## Where to go next

- How layers and data flow connect: [`architecture.md`](architecture.md)
- How content is produced and validated: [`content-pipeline.md`](content-pipeline.md)
- What every JSON file must contain: [`data-contracts.md`](data-contracts.md)
- Screens, routes, components, CSS: [`ui-structure.md`](ui-structure.md)
- Stores, localStorage, content loading: [`state-and-storage.md`](state-and-storage.md)
- How work is tracked and delivered: [`ticket-workflow.md`](ticket-workflow.md)
