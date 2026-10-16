# State and Storage

Covers: `app/src/store/`, `app/src/lib/loadContent.ts`, `app/src/lib/srs.ts`, `app/src/lib/flashcards.ts`, `app/index.html`
Read when: changing progress tracking or theme state, debugging content loading, caching, or fetch errors.

Three pieces of client state exist: two persisted Zustand stores, plus an in-memory request
cache for content. This file documents what each store guarantees, how content is fetched and
cached, and the trade-offs baked into the current implementation.

Flashcards add a third persisted store plus two pure library modules
(`lib/srs.ts`, `lib/flashcards.ts`) — see the Flashcards section below.

The game adds a fourth persisted store (`store/gameSessionStore.ts`) for run
snapshots — see the Game runs section below.

## Stores

Both stores use the curried form `create<T>()(persist(...))` from `zustand` +
`zustand/middleware`, which preserves TypeScript inference.

### `app/src/store/progressStore.ts`

**Persisted key:** `language-learning-progress`.

State:

```ts
{ levels: Record<string, { completedStudy: string[]; completedTests: string[]; completedGame: string[] }> }
```

| Entry | Format | Written by |
|---|---|---|
| `completedStudy` | `` `${type}:${id}` `` (`studyKey`) | `RulesListPage`, `StudyViewPage`, `StudyListToolbar` |
| `completedTests` | `TestQuestion.id` (12 hex chars) | `TestViewPage` on answer confirmation |
| `completedGame` | game card id (`` {level}|{type}:{lessonId}#{itemIndex} ``) | `GamePage` on answered rounds |

Actions — all take `level` as the first argument:

| Action | Behaviour |
|---|---|
| `markStudyComplete(level, key)` | append if absent |
| `markStudyCompleteBulk(level, keys[])` | append many |
| `toggleStudyComplete(level, key)` | add / remove |
| `clearStudyComplete(level, keys[])` | remove many |
| `markTestComplete(level, testId)` | append if absent |
| `resetTests(level)` | clear `completedTests` for the level |
| `markGameComplete(level, cardId)` | append if absent |
| `markGameCompleteBulk(level, cardIds[])` | append many |
| `resetGame(level)` | clear `completedGame` for the level |

Selectors-as-actions: `isStudyComplete(level, key)`, `isTestComplete(level, testId)`,
`isGameComplete(level, cardId)`.

Hook selectors: `useCompletedStudy(level)`, `useCompletedTests(level)`,
`useCompletedGame(level)`.

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
const PROGRESS_VERSION = 2;

function migrateProgress(persisted: unknown, version: number): unknown { /* … */ }
```

Rules:

- `migrate` receives `version = 0` for state written before versioning existed, so a `version < 1`
  guard covers every browser that already had progress.
- `mergeProgress` unions both arrays through a `Set` — renaming into a level that already has
  a partially-filled entry must not drop either side.
- **To rename a level:** append the pair to `LEVEL_RENAMES`, bump `PROGRESS_VERSION`, add a
  `version < N` branch. Never edit or remove a shipped pair.
- `version < 2` backfills a missing `completedGame: []` on every level entry, so browsers
  that saved progress before the game existed keep working.
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

## Flashcards — `flashcardsStore`, `lib/srs.ts`, `lib/flashcards.ts`

**Persisted key:** `language-learning-flashcards` (version 1; v1 migrates v0
payloads by filling in the speech defaults below).

State:

```ts
{
  initialized: boolean;
  settings: {
    selectedLevels: string[];
    lessons: string[] | null; // `{level}|{studyKey}` filter; null = all lessons
    fixedLesson: boolean;     // single-lesson mode hides the scope picker
    types: ('vocabulary' | 'phrases' | 'idioms')[];
    direction: 'en-ru' | 'ru-en' | 'mixed';
    newPerDay: number;        // default 20
    showExample: boolean;
    speechRate: number;       // default 1, clamped 0.5–2
    voiceURI: string | null;  // default null = auto-pick best English voice
  };
  progress: Record<cardId, CardProgress>;
}
```

Card ids are `{level}|{type}:{lessonId}#{itemIndex}` (see `buildDeck`). Reordering
items inside a lesson file orphans that card's SRS state — the same accepted
trade-off as derived test ids.

- `lib/srs.ts` is pure SM-2: `gradeCard(prev, grade, now)` maps the four UI
  grades to qualities 0/3/4/5, updates easiness (clamped at 1.3), and sets the
  next due day. `isDue` compares day-granular due dates, so review hour does
  not matter.
- `lib/flashcards.ts` builds the deck from `loadManifest` + `loadLexicon`
  (reusing the request cache) in textbook order, and splits it into
  `{ due (oldest first), fresh (deck order, capped at newPerDay) }`.
- The review session always renders the queue head: a graded card leaves the
  queue, so no index state exists and no re-render loop is possible.
- `ensureInitialized(allLevels)` selects every level on the very first visit;
  entry presets (`enterLevel`, `enterLesson`) overwrite the scope and persist
  like any other settings change.
- Deliberately separate from `progressStore`: flashcard SRS state must survive
  level renames differently (card ids embed the level id, a rename starts that
  level's cards fresh) and must never be read as study/test progress.

## Game runs — `gameSessionStore`

**Persisted key:** `language-learning-game` (version 0).

```ts
{ runs: Record<string, GameRunSnapshot> }
// snapshot: { scope, level, lesson, roundIndex, hearts, heartsLost,
//             spanStartLost, perfectCount, answered, totalRounds, updatedAt }
```

- Scope key is `lesson ?? level` (`lesson` is `{level}|{studyKey}`, so lesson
  decks never collide with whole-level runs).
- `GamePage` saves on every run change and clears on finish; round 0 with no
  answers is never saved. Resume clamps the position to the rebuilt session.
- Deliberately separate from `progressStore`: snapshots are ephemeral runs,
  completions are permanent; the lobby wipe clears both (`clearRun` +
  `resetGame`).

## Things that will bite you

1. **`persist` migration is rename-only.** It carries progress across a level-id rename and
   nothing else; a genuine state-shape change still needs a new `version < N` branch.
2. **`fetchJson` casts.** Contract changes must be mirrored in `lib/types.ts` **and**
   validated by `scripts/validate_level.py`; TypeScript will not catch a bad payload.
3. **`EMPTY_KEYS` must stay a shared constant.** Returning a fresh `[]` from the hooks causes
   an infinite render loop.
4. **The inline theme script in `app/index.html` runs before React.** Diverging from
   `themeStore` means a flash on every load.
5. **`TestViewPage` and `GamePage` mark progress on answer, not on success.** Do not read
   `completedTests` or `completedGame` as a score. The game "first try" counter is
   ephemeral session feedback and is never persisted.
6. **`app/public/content/` is disposable.** Regenerate it with `npm run dev`, `npm run build`
   or `python scripts/run_app.py`; never edit or read it as the source of truth.
7. **In production there is a second, persistent cache in front of `fetch`.** The
   service worker (build only — dev and e2e run without one) precaches the app
   shell and keeps a `CacheFirst` `content-cache` for `/content/**`. The in-memory
   `jsonCache` still dedupes within a session; across deploys a new worker takes
   over, so the content cache cannot serve a stale contract after an update.
