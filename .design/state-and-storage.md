# State and Storage

Three pieces of client state exist: two persisted Zustand stores, plus an in-memory request
cache for content. This file documents what each store guarantees, how content is fetched and
cached, and the trade-offs baked into the current implementation.

## Stores

Both stores use the curried form `create<T>()(persist(...))` from `zustand` +
`zustand/middleware`, which preserves TypeScript inference.

### `app/src/store/progressStore.ts`

**Persisted key:** `language-learning-progress`.

State:

```ts
{ levels: Record<string, { completedStudy: string[]; completedTests: string[] }> }
```

| Entry | Format | Written by |
|---|---|---|
| `completedStudy` | `` `${type}:${id}` `` (`studyKey`) | `RulesListPage`, `StudyViewPage`, `StudyListToolbar` |
| `completedTests` | `TestQuestion.id` (12 hex chars) | `TestViewPage` on answer confirmation |

Actions — all take `level` as the first argument:

| Action | Behaviour |
|---|---|
| `markStudyComplete(level, key)` | append if absent |
| `markStudyCompleteBulk(level, keys[])` | append many |
| `toggleStudyComplete(level, key)` | add / remove |
| `clearStudyComplete(level, keys[])` | remove many |
| `markTestComplete(level, testId)` | append if absent |
| `resetTests(level)` | clear `completedTests` for the level |

Selectors-as-actions: `isStudyComplete(level, key)`, `isTestComplete(level, testId)`.

Hook selectors: `useCompletedStudy(level)`, `useCompletedTests(level)`.

**Implementation details that matter:**

- Idempotent actions `return state` unchanged when there is nothing to do, which is what
  prevents needless re-renders.
- Both hooks fall back to a **module-level shared `EMPTY_KEYS: string[]`** constant. Because
  the reference is stable, the "no completed items" case does not create a new array each
  render and therefore cannot loop. Reuse that constant rather than returning a fresh `[]`.
- Serialisation uses the default `persist` envelope — `{ state, version: N }` — with **no
  `partialize`**. The one exception is the progress store's `migrate`, which exists to carry
  saved progress across a **level-id rename**; see below. Changing the state shape any other
  way still breaks existing progress in every browser.

#### Level renames — `LEVEL_RENAMES` + `PROGRESS_VERSION`

`state.levels` is keyed by level id, so renaming `content/{LEVEL}` orphans that level's
saved progress. The progress store therefore carries:

```ts
const LEVEL_RENAMES: ReadonlyArray<readonly [from: string, to: string]> = [['A2plus', 'A2+']];
const PROGRESS_VERSION = 1;

function migrateProgress(persisted: unknown, version: number): unknown { /* … */ }
```

Rules:

- `migrate` receives `version = 0` for state written before versioning existed, so a `version < 1`
  guard covers every browser that already had progress.
- `mergeProgress` unions both arrays through a `Set` — renaming into a level that already has
  a partially-filled entry must not drop either side.
- **To rename a level:** append the pair to `LEVEL_RENAMES`, bump `PROGRESS_VERSION`, add a
  `version < N` branch. Never edit or remove a shipped pair.
- The migration only moves data; it does not rename content. `sync_level.py {LEVEL}` rewrites
  `manifest.level` separately, and `validate_level.py` asserts `level`, `title` and folder name
  all agree.

### `app/src/store/themeStore.ts`

**Persisted key:** `language-learning-theme`.

```ts
{ theme: 'light' | 'dark', setTheme(theme), toggleTheme() }
```

- Initial value comes from `getSystemTheme()` → `window.matchMedia('(prefers-color-scheme: dark)')`.
- `applyTheme(theme)` sets `document.documentElement.dataset.theme = theme`.
- `onRehydrateStorage: () => (state) => state && applyTheme(state.theme)` re-applies the
  stored theme on load.
- There is **no** listener for OS-level theme changes at runtime: the app reads
  `prefers-color-scheme` once, at store creation.
- `ThemeProvider.tsx` subscribes to `theme` and re-runs `applyTheme` on every change. It
  renders no DOM wrapper — `children` pass through unchanged.
- FOUC is prevented by a **blocking inline script in `app/index.html`** that reads
  `localStorage['language-learning-theme']`, parses `.state.theme`, falls back to
  `prefers-color-scheme`, and sets `document.documentElement.dataset.theme` before hydration.
  If you add a theme attribute or a token override, keep that script in sync — it is the only
  thing standing between the user and a white flash.

## Content loading — `app/src/lib/loadContent.ts`

Base path constant: `CONTENT_BASE = '/content'`. There is no API layer, no bundler alias, and
no generated TypeScript from the JSON — everything is a runtime `fetch` against the static
public copy.

| Export | Request(s) | Failure behaviour |
|---|---|---|
| `listLevels()` | `/content/index.json`, then `manifest.json` per level **in parallel** | returns `[]` on a failed index; a level whose manifest throws is skipped via a per-level `catch` |
| `loadManifest(level)` | `/content/{level}/manifest.json` | throws |
| `loadRule(level, lessonId)` | category `index.json` → lesson file | throws (`File not found for rules/{lessonId}`) |
| `loadLexicon(level, type, lessonId)` | category `index.json` → lesson file | throws; `type` excludes `'rule'` |
| `loadTestDay(level, dayId)` | `/content/{level}/tests/{dayId}.json` | throws |
| `loadRulesForIds(level, ruleIds)` | `Promise.all` of `loadRule` | per-item `.catch(() => null)` then filtered — partial failure is tolerated |
| `collectStudyItemsForTestDay(questions, studyOrder)` | none (pure) | — |
| `resolveStudyTitle(level, item)` | one lesson file | throws; rules render `` `${unit} — ${title}` ``, lexicons render `lexicon.title` |

Private `fetchJson<T>(path)` throws `Failed to load ${path}: ${res.status}` when `!res.ok`,
otherwise casts `res.json()`. The cast is the important detail: **the JSON is not validated
at runtime**, so a schema mismatch surfaces as `undefined` deep inside a render, not as a
type error.

### `findDataFile(level, category, lessonId)` — the index indirection

1. `GET /content/{level}/data/{category}/index.json`, expected to be a `string[]` of
   filenames **including the ordinal prefix** (`"01-me-and-my-language.json"`).
2. Exact-suffix match: `f.endsWith(`${lessonId}.json`)`.
3. Fallback: loose `f.includes(lessonId)`.
4. No match, or the index itself missing / non-OK → `throw new Error(...)`.

This is the only place the client learns a filename. It is why
`python scripts/sync_level.py {LEVEL}` must run after adding or renaming a lesson file.

`collectStudyItemsForTestDay` unions every question's `relatedRuleIds` into a `Set`, then
walks `studyOrder` in order and keeps matching entries, deduping by `studyKey`. Result: the
sidebar list follows textbook order rather than question order.

## Caching: one in-memory request cache

`loadContent.ts` keeps a module-level `Map<string, Promise<unknown>>` keyed by request path.
`fetchJson` checks the map before hitting the network and stores the pending promise, so
concurrent and repeated callers share a single request.

- **Promise dedupe, not value caching.** Two `loadRule` calls for the same lesson issued in
  the same tick resolve from one fetch.
- **Failures are evicted.** A rejected entry is deleted from the map, so a retry after a
  content sync can succeed instead of replaying a stale error forever.
- **Lifetime is the page session.** There is no persistence and no TTL. In dev this is
  safe because the `content-sync` Vite plugin (`app/vite.config.ts`, `apply: 'serve'`)
  sends a `full-reload` on any change under `content/`, which discards module state along
  with the cache. In a production build the plugin does not run at all — content is baked
  into `dist/` at build time and cannot change while the page is open. Both cases mean
  "cached content never goes stale under a live page", so no explicit TTL is needed.
- **No invalidation API is exported** — with the full-reload behaviour there is no caller
  for one, and an uncalled export is dead code.
- **Cancellation is unchanged:** pages still use a local `cancelled` flag in `useEffect`
  cleanup, because no `AbortSignal` is passed to `fetch`. Requests still complete; only the
  `setState` is skipped.

What the cache does and does not fix:

| Site | Before | After |
|---|---|---|
| `RulesListPage` (32 lessons) | 2 requests per entry — `index.json` re-fetched every time | 4 index fetches (one per category) + one payload per entry |
| `TestViewPage` related rules | 2 requests per rule id | one payload per rule id, index fetched once |
| Back-navigation | everything re-fetched | served from cache |
| `TestsListPage` | every day file up front | unchanged — it renders question text inline, so the payloads are genuinely needed. A summary index would be the real fix, and that is a content-contract change. |

No `AbortController`, no `localStorage` content cache, no service worker.

## Rendering-state patterns used by pages

- Tri-state loading: `loading` / `error` / data, with «Загрузка...» while pending.
- Every fetch lives in a `useEffect` with a `cancelled` flag guarding `setState`.
- Dependent fetches are sequenced: manifest first, then derived data, then titles in
  `Promise.all`.
- `TestViewPage` resets `selected`, `confirmed` and `showRules` on `[qIndex, dayId]` so the
  sidebar state cannot leak between questions.

## Things that will bite you

1. **`persist` migration is rename-only.** It carries progress across a level-id rename and
   nothing else; a genuine state-shape change still needs a new `version < N` branch.
2. **`fetchJson` casts.** Contract changes must be mirrored in `lib/types.ts` **and**
   validated by `scripts/validate_level.py`; TypeScript will not catch a bad payload.
3. **`EMPTY_KEYS` must stay a shared constant.** Returning a fresh `[]` from the hooks causes
   an infinite render loop.
4. **The inline theme script in `app/index.html` runs before React.** Diverging from
   `themeStore` means a flash on every load.
5. **`TestViewPage` marks progress on confirm, not on success.** Do not read
   `completedTests` as a score.
6. **`app/public/content/` is disposable.** Regenerate it with `npm run dev`, `npm run build`
   or `python scripts/run_app.py`; never edit or read it as the source of truth.
