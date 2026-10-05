# Content Pipeline

Eleven Python files in `scripts/`: one shared library plus ten CLI utilities. Every
level-scoped command takes the level id as its first argument.

## `scripts/content_utils.py` — shared library (no CLI)

Stdlib only (`hashlib`, `json`, `pathlib`). Imported by every other script.

**Constants**

| Name | Value |
|---|---|
| `ROOT` | parent directory of `scripts/` |
| `CONTENT` | `ROOT/content` |
| `TO_EXTRACT` | `ROOT/toExtract` |
| `DATA_CATEGORIES` | `("rules", "vocabulary", "phrases", "idioms")` |
| `STUDY_TYPES` | `("rule", "vocabulary", "phrases", "idioms")` |
| `PDF_NAMES` | `{"sb": "SB.pdf", "wb": "WB.pdf"}` |

`STUDY_TYPES` and `DATA_CATEGORIES` are positionally paired — singular `type` name ↔ plural
folder name — and consumed via `zip()`.

**Path helpers** — `level_dir`, `data_dir(level, category)`, `tests_dir(level)`,
`manifest_path(level)`, `find_pdf(level_dir, kind)`.

`find_pdf` locates `SB.pdf` / `WB.pdf` inside a `toExtract/{LEVEL}/` folder,
case-insensitively, returning `None` when absent.

**Level skeleton** — `ensure_skeleton(level, source=None)` creates `data/{rules,vocabulary,
phrases,idioms}/` and `tests/` for the level, writes a default `manifest.json`
(`title = level`, empty `studyOrder` and `testDays`) **only when none exists**, and then
refreshes `content/index.json`. It never overwrites an existing manifest. The `source`
mapping (`sb` / `wb` → path relative to the level dir) is built by the caller, because the
two extractors derive it differently — from the PDFs they found, and from the `.txt` files
already on disk.

**I/O** — `load_json(path)`, `write_json(path, data)`. Writes always use
`ensure_ascii=False, indent=2` plus a trailing newline, and `mkdir(parents=True,
exist_ok=True)` on the parent directory. All JSON in this project therefore uses that exact
formatting; hand edits that break it will show up as diff noise.

**Core algorithms**

- `test_id(question, options, correct_index)` — canonical question id:
  `sha256(f"{question}|{'|'.join(options)}|{correct_index}".encode("utf-8")).hexdigest()[:12]`
- `list_data_files(directory)` — `sorted(glob("*.json"))` **excluding `index.json`**, so a
  generated index can never feed back into the pipeline.
- `lesson_id_from_data(data)` — `data["id"] or data["lessonId"]`; rules use `id`, all
  other categories use `lessonId`.
- `load_rules_ordered(level)` — rule files sorted by `(data.get("order", 9999), filename)`.
  This is the ordering spine of the whole system.
- `build_study_order(level)` — for each ordered rule, emit `{type, id}` for every category
  whose file exists. Produces the flat `rule → vocabulary → phrases → idioms` sequence.
- `build_category_index(level, category)` — ordered **filenames** for one category, driven
  by rule order. For `category == "rules"` it falls back to the rule's own path, so rules
  are always included even when unmatched.
- `update_content_index()` — writes `content/index.json` from the sorted names of every
  `content/` subdirectory that contains a `manifest.json`.
- `make_question(...)` — canonical test question object.
- `build_rule_content_md(heading, essence, how, live_examples, lifehack)` — assembles the
  markdown shape from `prompts/rule-generation-style.md`. Section headings are **hardcoded
  Russian strings** (`### Простая суть`, `### Как это работает`, `### Живые примеры`,
  `### Лайфхак для запоминания`) and bullets are `- {target} — {translation}`.

## Extractors

### `scripts/extract_pdf.py [LEVEL]`

Raw `sys.argv` (no argparse). No argument processes every level directory under
`toExtract/`; an argument filters by exact directory name and exits 1 if it matches nothing.

- Dependency: `pypdf.PdfReader`.
- Finds PDFs case-insensitively through `content_utils.find_pdf`.
- Writes `content/{LEVEL}/extract/SB.txt` and `WB.txt`, prefixing each page with
  `\n\n--- PAGE {i + 1} ---\n\n`; text is read with `errors="replace"`.
- Builds `source` from the PDFs actually found and calls
  `content_utils.ensure_skeleton(level, source)`, which creates `data/*/`, `tests/` and a
  skeleton `manifest.json` when absent. Existing manifests are never clobbered.
- Skips a level that has neither `SB.pdf` nor `WB.pdf`.
- Its local `extract_pdf()` writes the text file and stays extractor-specific.

### `scripts/extract_pdf_ocr.py [LEVEL]`

Same CLI shape and same output contract as `extract_pdf.py`, but rasterises pages with
PyMuPDF and OCRs them.

- **Import-time side effect:** `_find_tesseract()` searches, in order,
  (1) the `TESSERACT_CMD` environment variable if it points at a file,
  (2) NormCap's bundled `tesseract.exe`,
  (3) `C:/Program Files/Tesseract-OCR/`, (4) `C:/Program Files (x86)/Tesseract-OCR/`.
  If none is found it prints an error and **exits 1 at import time** — so importing this
  module for testing aborts the interpreter.
- Resolves `TESSDATA_PREFIX` (default `tessdata` sibling of the binary, else the first
  sibling directory containing `eng.traineddata`) and assigns
  `pytesseract.pytesseract.tesseract_cmd`.
- `ocr_page(page, dpi=250)` — `get_pixmap(dpi=250)` → `Image.frombytes("RGB", ...)` →
  `pytesseract.image_to_string(img, lang="eng")`. **OCR language is hardcoded to `eng`**,
  which is a hard limit for non-English textbooks.
- Progress is printed every 10 pages.
- Calls `content_utils.ensure_skeleton(level, source)` with `source` derived from the
  **existing `.txt` files** rather than from the found PDFs, so it is safe to run after a
  failed or partial text extraction.
- Its local `extract_pdf()` drives PyMuPDF and stays extractor-specific.

## Sync, validate, repair

### `scripts/sync_level.py LEVEL`

`argparse`, single required positional. Reads the manifest and all `data/*/**.json`; writes
five targets:

1. `manifest.json` — sets `level`, **overwrites `studyOrder`** from `build_study_order`
2. `data/rules/index.json`
3. `data/vocabulary/index.json`
4. `data/phrases/index.json`
5. `data/idioms/index.json`
6. `content/index.json`

`title`, `source` and `testDays` are preserved. Exits 1 when the manifest is missing.
Prints per-category counts, `studyOrder` length, and the resulting level list.

### `scripts/validate_level.py LEVEL`

`argparse`. **Reads everything, writes nothing.** Exits 1 on any error, otherwise prints
`OK: {level} passed validation`.

It does not trust the files: it re-derives expectations with `build_study_order` and
`build_category_index` and compares deep-equality. Four validators:

| Validator | Checks |
|---|---|
| `validate_rules` | `id` present and unique; `contentMd` present; `order` present (no range check) |
| `validate_lexicon` | `lessonId` exists **and** matches a known rule id; `items` non-empty; per-item required key (`term` / `phrase` / `idiom` by category) plus `translation` |
| `validate_manifest` | `level` matches the argument; `studyOrder` deep-equals the derived value (else "run `sync_level.py`"); each of the four `index.json` files exists and deep-equals its derived value |
| `validate_tests` | per `testDays` id: file exists, root is an array, `1 <= len(options) <= 4`, `0 <= correctIndex < len(options)`, `id == test_id(...)` (else "run `fix_test_ids.py`"), every `relatedRuleIds` entry resolves to a real rule |

### `scripts/fix_test_ids.py LEVEL`

`argparse`. Recomputes `test_id` for every question in every `tests/day-NN.json` listed in
`testDays`. Writes **only the files whose ids actually changed** (per-file `changed` flag), so
untouched days are not reformatted. Missing day files produce a warning on stderr, not a
failure. It indexes `question` / `options` / `correctIndex` **by key**, so a malformed
question raises `KeyError` rather than being reported as a validation error.

## Test generation

### `scripts/generate_vocab_questions.py LEVEL [--lesson ID]... [--count N] [--output PATH]`

Reads `data/vocabulary/*` and `data/phrases/*`. `--lesson` is repeatable; the default set is
`sorted(rule_ids(level))`; an unknown `--lesson` exits 1. Without `--output` the JSON array
goes to stdout.

- `collect_distractors(level, exclude)` pools **every** term and phrase across *all* lessons of
  both categories, case-insensitively excluding the answer — the distractor pool is
  level-wide, not lesson-scoped, so distractors may come from unrelated lessons.
- `vocab_questions(level, lesson_id, count)` requires both a term and an example for an item
  to enter the pool, then seeds `random.Random(hash(f"{level}:{lesson_id}") & 0xFFFFFFFF)`.
  Deterministic per `(level, lesson)` **within one interpreter run only**, because `hash()` on
  `str` depends on `PYTHONHASHSEED`.
- Question shapes:
  - vocabulary → `Which word means '{translation}'?`
  - phrases → the term is replaced with `___` inside its own example →
    `Complete the sentence: …`, falling back to `Choose the correct collocation: …` when the
    term is not literally present in the example.
- `options = [term] + distractors[:3]`, shuffled; `correctIndex = options.index(term)`
  computed **after** the shuffle; `relatedRuleIds = [lesson_id]`.
- Truncation happens twice (`pool[:count]` in the loop, and `questions[:count]` at the end).

### `scripts/assemble_tests.py LEVEL [--plan PATH]`

Default plan path is `content/{LEVEL}/test_plan.json`. Imports `vocab_questions` from
`generate_vocab_questions` (and does a function-local `from content_utils import
make_question` to avoid a circular import).

Reads the plan, optional `tests/sources/{lessonId}.json` grammar pools, all
vocabulary/phrase files, and the manifest. Writes `tests/day-01.json …` and rewrites
`manifest["testDays"]` with the full generated list. `FileNotFoundError` / `ValueError` are
caught, reported on stderr, and exit 1.

- `load_grammar_sources` — `tests/sources/{lessonId}.json`; must be a JSON array or
  `ValueError`.
- `normalize_question` — requires all five keys `{question, options, correctIndex,
  explanation, relatedRuleIds}` and rejects more than 4 options, then returns
  `make_question(...)`. Grammar sources therefore carry **no `id`** — it is computed here.
- `build_day(level, lesson_ids, target)` — quotient/remainder distribution:
  `per_lesson = target // len(lessons)`, `extra = target % len(lessons)`, and the first
  `extra` lessons get one extra slot. Per lesson, grammar questions come first
  (`grammar[:need]`) and are topped up by `vocab_questions(level, lesson_id, need - len(grammar))`,
  then truncated to `need`.
- `assemble_tests` — validates every lesson id against `rule_ids(level)`, names days
  `day-{n:02d}` from 1, and **fails the whole run** if any day does not come out at exactly
  `questionsPerDay`. Insufficient vocabulary surfaces as an error, never as a short day.

### `scripts/generate_all_tests.py [LEVEL]`

The largest script (~1340 lines, ~84 KB) and the least reusable: **no `sys.argv` parsing of
its own beyond argparse, and a hand-authored question bank for `A2+`.** It imports from
`content_utils` — `test_id` (as `compute_id`), `load_json`, `write_json`, `manifest_path`,
`tests_dir` — so it does not duplicate the hash or the JSON formatting.

`argparse` with one optional positional `level`, default `A2+`, so the historical
zero-argument invocation still works. It exits 1 when `content/{LEVEL}/manifest.json` is
missing, which prevents scattering another level's question bank into a real level.

Structure: 30 module-level literals `DAY01` … `DAY30`, each holding ~12 hand-authored
questions grouped by lesson behind `# ─── DAY NN: lesson-a + lesson-b ───` comments, all
aggregated into `ALL_DAYS`. `main()`:

1. creates `tests/`,
2. writes `day-01.json … day-30.json` via `write_json`, recomputing every `id` first so a
   stale bank can never ship an id that fails validation,
3. updates `manifest["testDays"]` to `day-01 … day-30` **only if it differs**, preserving
   every other manifest field,
4. prints per-day counts and a `validate_level.py` hint.

Only the output target is parameterised. The questions are level-specific — for another
level use `assemble_tests.py`.

### `scripts/build_rule_md.py --heading … --essence … --how … --lifehack … [--example EN RU]… [--json]`

Pure stdout transformer — reads and writes nothing. All four text flags are required;
`--example` is repeatable with exactly two values and lands in `examples`.
Plain mode prints the markdown; `--json` prints `{"contentMd": …, "examples": [en, …]}`,
where `examples` is **capped at 4** and contains only the target-language side (translations
are dropped).

## `scripts/run_app.py` — no arguments

- `sync_content()` — `shutil.rmtree(app/public/content)` then `copytree(content → app/public/content)`.
  Destructive full replace. Soft no-op with a message if `content/` is missing.
- `npm_cmd()` — resolves `shutil.which("npm")`, exits 1 with a Node.js download link if absent.
- Runs `npm install` **only if `app/node_modules` is absent**, then `npm run dev`, both with
  `check=True` so a non-zero exit code aborts.

## Typical sequences

```bash
# new level from PDFs
python scripts/extract_pdf.py {LEVEL}        # or extract_pdf_ocr.py for scans
# ... agent writes content/{LEVEL}/data/** and manifest.json ...
python scripts/sync_level.py {LEVEL}
python scripts/validate_level.py {LEVEL}

# tests, variant B (plan + grammar sources + auto vocabulary)
cp prompts/test-plan.example.json content/{LEVEL}/test_plan.json
# hand-write content/{LEVEL}/tests/sources/{lessonId}.json
python scripts/assemble_tests.py {LEVEL}
python scripts/validate_level.py {LEVEL}

# repair after hand-editing a question
python scripts/fix_test_ids.py {LEVEL}
python scripts/validate_level.py {LEVEL}
```

## Extending the pipeline

- New shared helper → `scripts/content_utils.py`; import it, do not re-implement. The hash
  formula, `list_data_files` and `build_study_order` in particular must not be duplicated.
- New level-scoped CLI → `argparse` with the level id as the first positional, stdlib only,
  no imports from `app/`.
- New derived artefact → add a `build_*` helper in `content_utils.py`, write it from
  `sync_level.py`, and assert it in `validate_level.py`. Anything `validate_level.py` does not
  check will silently rot.
- New test source → extend `test_plan.json` / `tests/sources/*.json` and
  `assemble_tests.normalize_question`; do not hand-write `id`, it is derived.
