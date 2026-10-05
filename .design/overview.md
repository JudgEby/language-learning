# Overview

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
- Remember progress across sessions with zero infrastructure.
- Keep every content transformation scriptable, deterministic, and re-runnable.

## Non-goals

- No user accounts, no sync between devices, no server-side persistence.
- No authoring UI: content changes are made by editing JSON and re-running scripts.
- No grading, scoring, spaced repetition, or adaptive difficulty.
- No streaming audio, no media assets beyond SVG logos.

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
| `typescript` | ~5.7 | `tsc -b` typecheck |

Styling is a **single plain CSS file** (`app/src/index.css`, ~810 lines) with CSS custom
properties for theming. No Tailwind, no CSS modules, no preprocessor.

## Repository layout

```
├── AGENTS.md              # AI-agent instructions: JSON schemas, workflows, commands
├── .design/               # this folder — modular architecture docs (English)
├── prompts/               # editable prompt assets (rule style, test templates)
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
| `A2` | prepared stub — extract text, four empty `data/*/index.json`, no lessons or tests |
| `A2plus` | 36 lessons, 30 test days, ~300 vocabulary items |
| `B1` | 32 lessons, 30 test days |
| `B2` | 32 lessons (ids like `1a-my-id`), 6 test days |
| `B2+` | 32 rules, 28 vocabulary / 2 phrases / 3 idioms files, 30 test days |

Level ids are latin-only folder names with no spaces (`B2+` is the one exception to that
convention, and it is used verbatim in URLs).

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
