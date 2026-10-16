# UI Structure

Covers: `app/src/main.tsx`, `app/src/App.tsx`, `app/src/pages/`, `app/src/components/`, `app/src/lib/plural.ts`, `app/src/index.css`, `app/index.html`, `app/e2e/`, `app/playwright.config.ts`
Read when: adding a page, route, or component; changing UI copy; changing colours or the theme; writing or debugging an e2e test.

## Entry and providers

`app/src/main.tsx` mounts `<App/>` into `#root` with `StrictMode`. It imports
`./index.css` and registers no providers.

`app/src/App.tsx` composes the provider stack and the route table:

```
ThemeProvider          (app/src/components/ThemeProvider.tsx)
└── BrowserRouter
    ├── SettingsButton  (fixed top-right, z-index 100, sibling of <main>)
    └── main.app-shell (max-width 960px, centered)
        └── <Routes>
```

There is **no** error boundary, **no** 404 fallback route, and **no** lazy loading or code
splitting. `StudyViewPage` is deliberately reused for two routes and distinguishes them by
whether `dayId` is present in the params.

## Route table

| Path | Component | Purpose |
|---|---|---|
| `/` | `HomePage` | level list, plus the global «Карточки» entry |
| `/flashcards` | `FlashcardsPage` | SM-2 review session, settings, scope picker |
| `/settings` | `SettingsPage` | theme switch and speech voice/rate, back link to `?from=` |
| `/:level` | `LevelPage` | choose study, tests, level-scoped cards, or game |
| `/:level/game` | `GameLobbyPage` | continue a saved run, restart, run stats |
| `/:level/game/play` | `GamePage` | association word game for the level (or one lesson) |
| `/:level/rules` | `RulesListPage` | flat numbered study list |
| `/:level/rules/:studyKeyParam` | `StudyViewPage` | one rule or lexicon |
| `/:level/tests` | `TestsListPage` | all days, all questions |
| `/:level/tests/:dayId/study` | `TestDayStudyListPage` | study items behind one day |
| `/:level/tests/:dayId/study/:studyKeyParam` | `StudyViewPage` | one item in day context |
| `/:level/tests/:dayId/:questionIndex` | `TestViewPage` | single question |

`:studyKeyParam` is a `studyKey` (`type:id`) passed through `encodeURIComponent` and decoded
with `parseStudyKey()`. `:questionIndex` is parsed with `parseInt`. Breadcrumbs follow
«К списку» → «К уровню» → «Ко всем уровням».

## Pages

### `HomePage.tsx`
`listLevels()` in a `useEffect(…, [])`; tri-state `loading` / `error` / `levels`. Renders
`PageHeader title="Language Learning"` with `Logo` (48×31), then an `action-list`
with the global «Карточки» link to `/flashcards`, then `ul.card-list` of
`Link.card` per level.

Card title is the level title, which equals the level id — `A2`, `A2+`, `B1`, `B2`, `B2+`.
Nothing else identifies a level in the UI; the textbook series is not shown.

Card meta comes from `describeLevel(level)` in the same file: `lessonCount` and
`testDayCount` via `lessons()` / `testDays()` from `app/src/lib/plural.ts`, joined with ` · `
(`36 уроков · 30 дней тестов`). A level with `lessonCount === 0` renders
«Материал в разработке» instead. `listLevels()` derives both counts from the manifest —
`lessonCount` is the number of **distinct** `studyOrder` ids, not the entry count, because one
lesson contributes up to four entries (rule → vocabulary → phrases → idioms).

Empty state: «Нет доступных уровней…».

### `LevelPage.tsx`
`useParams().level`, `loadManifest(level)` keyed on `[level]`. Renders a back link to `/`
and `div.action-list` of conditional `action-btn` links: «Изучать правила» →
`/{level}/rules` when `studyOrder.length`, «Проходить тесты» → `/{level}/tests` when
`testDays.length`, «Карточки» → `/flashcards?level={level}` when `studyOrder.length`,
«Играть» → `/{level}/game` when `studyOrder.length`,
otherwise «Для этого уровня пока нет материалов.»

### `RulesListPage.tsx`
Loads the manifest, then `Promise.all(manifest.studyOrder.map(resolveStudyTitle))` — one
payload request per entry, with the category `index.json` lookups deduped by the
`loadContent.ts` cache — and a `.catch(() => item.id)` fallback so a missing file
degrades to the raw id. Renders `ol.numbered-list` of `Link.list-link` to
`/{level}/rules/{encodeURIComponent(studyKey)}`, showing the `STUDY_TYPE_LABELS` badge and the
resolved title. Each row carries an interactive `CheckMark` whose `stopPropagation()` keeps
the checkbox from navigating. `StudyListToolbar` sits in the header actions.

### `StudyViewPage.tsx`
Decodes `studyKeyParam`, then loads `loadRule` or `loadLexicon` by `type`.

- Rule branch: `unit-label`, then `ReactMarkdown` with `remarkPlugins={[remarkGfm]}` over
  `contentMd`, then an «Примеры» section listing `rule.examples` as `<em>` inside a `ul`.
- Lexicon branch: `ul.lexicon-list`; each row shows `strong` = `item.term ?? item.phrase ??
  item.idiom ?? ''` with a `SpeakButton` («Озвучить слово»), the translation, and the
  example in `.lexicon-example` with a `SpeakButton` («Озвучить пример»).
  English strings carry `lang="en"`.

Footer: primary button `markStudyComplete` (disabled and relabelled «Отмечено как
пройденное» once done) plus a secondary back button navigating to `listPath`, which is
`/{level}/tests/{dayId}/study` in the day context and `/{level}/rules` otherwise.
On lexicon entries (any `type` except `rule`) a second secondary button «Карточки»
navigates to `/flashcards?lesson={level}|{studyKey}` — a fixed single-lesson deck —
and a third secondary button «Игра» navigates to the same lesson as a fixed game deck
(`/{level}/game?lesson={level}|{studyKey}`).

### `FlashcardsPage.tsx`

Route `/flashcards` (static, so it wins over `/:level`). The review session comes
first, then the two configuration sections:

- Scope («Что повторяем»): level checkboxes, category toggles
  (`vocabulary`/`phrases`/`idioms`), per-level collapsible lesson checklists with
  titles via `resolveStudyTitle`, and a scope footer with the total deck size
  (`Всего: N карточек (слов: X · фраз: Y · идиом: Z)`, hidden while loading,
  on error, or when the deck is empty). Hidden in single-lesson mode (`?lesson=`), which
  instead shows a fixed-deck note with a «Показать выбор уровней и уроков» reset.
- Settings («Настройки»): direction (`en-ru`/`ru-en`/`mixed`), `newPerDay`,
  example toggle, progress reset behind `ConfirmModal`. Speech voice/rate
  (`SpeechSettings`) used to live here but moved to the settings page.
- Review: queue counters, then `FlashcardView` (front → «Показать ответ» →
  translation, example, keyword/mnemonic block → four grades
  «Снова»/«Трудно»/«Хорошо»/«Легко»). The English side (front or back,
  depending on direction) and the example carry a `SpeakButton` backed by
  OS-native speech synthesis. The session always shows the head of the
  queue — a graded card leaves it, so no index state exists.

Entry presets come from search params consumed once on mount: `?level=` selects
one level, `?lesson={level}|{studyKey}` pins a fixed single-lesson deck. First
visit selects all levels via `ensureInitialized`; afterwards stored settings win.
A plain visit (no params) clears a stuck lesson filter. The back link follows
the entry: lesson deck → the lesson study page («К списку»), level preset →
the level page («К уровню»), plain visit → `/` («Ко всем уровням»).

### `SettingsPage.tsx`

Route `/settings` (static, so it wins over `/:level`). Two sections: «Тема»
(a `Toggle` bound to `themeStore`: on means dark) and «Озвучка» (the shared
`SpeechSettings` component, backed by `flashcardsStore`). The gear that opens
this page passes the current address as `?from=`; the `PageHeader` back link
points at it («Назад»), falling back to `/` («Ко всем уровням») on a direct
visit, a reload, or a `from` that points back at `/settings` itself.

### `GameLobbyPage.tsx`

Route `/:level/game`. Entry hub for the game: «Продолжить» navigates to
`/:level/game/play` (disabled with no saved run), «Начать с начала» starts
fresh at once when empty or behind a `ConfirmModal` («Вы действительно хотите
начать с самого начала? Весь предыдущий прогресс будет удалён.») that wipes
the run snapshot plus the level's `completedGame`. Under «Продолжить» a saved
run shows «Пройдено X% · Потрачено жизней: N». Supports `?lesson=` fixed decks
like flashcards; the back link returns to the lesson study page or the level
page.

### `GamePage.tsx`

Route `/:level/game/play` (static suffix, so it never clashes with `/:level`). The word game
plays the level's own lexicon (`vocabulary`/`phrases`/`idioms`) through rounds built by
the pure engine `app/src/lib/associationGame.ts`, which mirrors the reference game's
loop (verified against its package scripts): new words are learned in blocks of 4 —
intro cards (term + translation + keyword/mnemonic + example + `SpeakButton`), then
each word is quizzed (the word is shown, the learner picks its translation), then the
block is played as matching pairs, then each word is spelled from shuffled letters
(free assembly with «Стереть букву», then «Проверить» on the whole word —
a failed check costs 1 heart and clears the slots for retry). A fail checkpoint
covers two deal blocks (8 cards): «Продолжить с блока» jumps to the current
8-card checkpoint with full hearts while progress and counters are kept. The first
round of every checkpoint span carries a «★ Чекпоинт · прогресс сохранён» badge
(`.game-checkpoint`) so the save point is visible. Arriving at a checkpoint span
with at least one heart left also heals hearts back to full automatically. Decks
come from `takeGameCards` in strict textbook order (the whole level, or the whole
lesson for `?lesson=` decks — uncapped); `?lesson={level}|{studyKey}` pins
a fixed single-lesson deck with a back link to the lesson study page, otherwise
the back link returns to the level page. There are no persistent lives (the reference refills hearts on a timer and sells
continues for coins — both rejected as monetization, not gameplay): each session
starts with 3 hearts (`MAX_HEARTS`, an approximation — exact constants live in the
reference server config), every wrong answer in choice/match/spelling costs 1 heart
with the existing red mistake flash, and 0 hearts shows «Жизни закончились!». Hearts
render as pixel-art inline SVG (`PixelHeart` in the same file: 11×8 map with
outline/red/shade/highlight, grey palette once lost). The
fail screen offers «Продолжить с блока» (jump to the 8-card checkpoint above)
and «С начала» (full `resetSession`). The page
saves a run snapshot to `gameSessionStore` on every change (round 0 with no
answers is not saved — nothing to resume), loads it on entry, and clears it on
finish; the play back-link leads to the lobby. Answering still marks the card via
`markGameComplete` / `markGameCompleteBulk` (progress means *answered*), and
«Продолжить» stays disabled until the round is answered (choice confirmed /
all pairs solved / word assembled), so rounds cannot be skipped. Progress
header shows the checkpoint counter («Чекпоинт X из N»), «Идеально» (checkpoints
finished without losing a heart — never persisted as a score),
and the stored word count. The finish screen offers «Играть ещё раз», «К уровню»,
and a `ConfirmModal`-guarded game-progress reset. Entry points: «Играть» on
`LevelPage`, «Игра» beside «Карточки» on lexicon study pages. Styling reuses
`.test-main`, `.options`, `.option-btn` (`selected`/`correct`/`incorrect`), plus small
`.game-*` classes (progress, round kind, match grid, spelling slots/letters) in
`index.css`.

Answer feedback is a `ScreenFeedback` overlay (`signal: FeedbackSignal | null`,
cleared by timeout): a correct answer flashes a green rotating edge glow, a wrong
answer a heavier red one, and any heart loss adds a short `.app-shell--shake`.
The overlay is `position: fixed`, `pointer-events: none`, `aria-hidden`. It plays
regardless of `prefers-reduced-motion` — the owner requires the glow to stay
visible under any OS settings (ticket #14). Colours reuse
`--color-success`/`--color-error`, so no new tokens were added.

### `TestsListPage.tsx`
Loads the manifest, then `Promise.all` over **every** day file — all days are fetched up
front just to render the list. Day labels are positional («День 1», …), not taken from ids.
Per day: `section.test-day-section` with a header (`h2` + «Правила» link to the day study
list) and `ol.numbered-list` of questions linking to `/{level}/tests/{dayId}/{i}` with a
read-only `CheckMark done`. Header action «Сбросить» opens `ConfirmModal` →
`resetTests(level)`.

### `TestDayStudyListPage.tsx`
Loads the manifest and the day, rejecting with `День ${dayId} не найден` when
`manifest.testDays` does not contain the id. `collectStudyItemsForTestDay(questions,
studyOrder)` unions the questions' `relatedRuleIds`, then re-walks `studyOrder` so the list
keeps textbook order; titles resolve in parallel. Header is «Материалы — День N». Empty state:
«Нет материалов для этого дня.»

### `TestViewPage.tsx`
The only stateful quiz page. Three effects: load the day keyed on `[level, dayId]`; reset
`selected` / `confirmed` / `showRules` on `[qIndex, dayId]`; load
`loadRulesForIds(level, question.relatedRuleIds)` on `[level, question]`. Missing question
renders «Вопрос не найден».

Two-step answer flow: selecting an option only sets `selected`; «Подтвердить выбор» is
disabled until something is selected; `handleConfirm` sets `confirmed` **and** calls
`markTestComplete(level, question.id)`. Progress therefore means *answered*, not *correct*.
After confirmation the panel shows «Верно!»/«Неверно.» plus `explanation`, and «Продолжить»
navigates to `qIndex + 1` or back to `/{level}/tests` on the last question.
`optionClass(i)` yields `selected` / `correct` / `incorrect` / plain.

Right rail: `aside.test-sidebar`, an animated accordion — `.test-sidebar` animates width from
`3.25rem` to `--open: 24rem` over `.25s`, the collapsed title uses `writing-mode: vertical-rl`,
a chevron rotates, and a badge shows the count. When open it lists the related rules, each
rendered through `ReactMarkdown` + `remark-gfm` again.

## Components (`app/src/components/`)

| File | Exports | Notes |
|---|---|---|
| `Layout.tsx` | `BackLink`, `PageHeader`, `CheckMark`, `Toggle` | despite the filename there is **no** `Layout` export |
| `ConfirmModal.tsx` | `ConfirmModal` | controlled; returns `null` when closed |
| `ThemeProvider.tsx` | `ThemeProvider` | effect-only sync, passes children through unchanged |
| `SettingsButton.tsx` | `SettingsButton` | fixed top-right gear `Link` to `/settings?from=…` |
| `Logo.tsx` | `Logo`, `LogoProps` | two "L" glyphs, neon gradient `#ff1493 → #8338ec → #fb5607 → #ffbe0b` |
| `FlashcardView.tsx` | `FlashcardView` | card front/answer, example, mnemonic block, four grade buttons, `SpeakButton` on the English side |
| `SpeakButton.tsx` | `SpeakButton` | icon-only pronunciation button via `lib/speech.ts`; reads voice/rate from `flashcardsStore`, disabled where unsupported |
| `ScreenFeedback.tsx` | `ScreenFeedback`, `FeedbackSignal`, `FeedbackKind` | full-screen answer glow, mounted by `GamePage` but portalled to `document.body` (so the `.app-shell` shake transform cannot re-base the fixed frame); `null` signal renders nothing |
| `SpeechSettings.tsx` | `SpeechSettings` | voice (`voiceURI`, auto = best English) and rate selects; rendered on the settings page; lists English voices first, shows the auto-picked voice, warns with install steps for the detected OS (`getSpeechPlatform`) when no English voice exists, plus an always-visible collapsed install guide for the current platform |

`BackLink({to, label})` renders `.back-link` with a `← ` prefix. `PageHeader({title, backTo,
backLabel, actions})` renders `.page-header`, `.page-header__row`, `.page-header__actions`.
`CheckMark({done, onChange?})` is **dual-mode**: with `onChange` it renders a visually hidden
native checkbox inside `label.study-checkbox` (icon state driven by `--done`) so keyboard and
screen-reader users get a real control; without `onChange` it renders a read-only
`.check-mark`. `CheckIcon()` is a 24×24 inline SVG with path `M20 6L9 17l-5-5`,
`stroke="currentColor"`. `Toggle({checked, onChange, label})` is a switch-style
control over a native checkbox, so keyboard, screen readers and
`getByRole('checkbox')` in e2e keep working; used for every flashcards
scope/settings switch.

`ConfirmModal` defaults: `confirmLabel='Подтвердить'`, `cancelLabel='Отмена'`, cancel styled
`btn-secondary`, confirm `btn-danger`. Backdrop click closes (`.modal-overlay`),
`.modal-dialog` stops propagation. **No Escape handling, no focus trap, no portal.**

`Logo` uses `useId()` for the gradient id with `:` stripped (`ll-gradient-…`) so the
`url(#…)` reference stays valid.

## Markdown rendering

`react-markdown` + `remark-gfm` are used in exactly two places: `StudyViewPage` for
`rule.contentMd`, and `TestViewPage` for the sidebar rules. There is **no** `rehype-raw` and
**no** `rehype-sanitize`, and no component overrides. GFM support exists specifically for
tables in rule markdown; table styles are applied through descendant selectors
(`.study-content table`, `.rule-panel-item table`, `th`, `td`, `thead`, `tbody tr:hover`,
`table code`). Non-table inline markdown (`.study-content code`, emphasis outside tables) is
**not** styled.

## Styling — `app/src/index.css`

A single ~810-line plain-CSS global stylesheet. No preprocessor, no CSS modules, no utility
framework, no CSS-in-JS. Reset is minimal: global `box-sizing: border-box` plus a `body`
margin reset. Class names are semantic and BEM-ish (`.page-header__row`,
`.study-checkbox--done`, `.option-btn.correct`). Font stack:
`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. Shell is centered at
`max-width: 960px`.

### Theme tokens

30 custom properties, all `--color-` prefixed, defined on `:root` and overridden under
`[data-theme='dark']`; `color-scheme` switches with them. `dataset.theme` is set by
`themeStore.applyTheme()` and pre-set by the inline script in `app/index.html`.

`--color-bg`, `--color-text`, `--color-text-muted`, `--color-text-secondary`,
`--color-text-tertiary`, `--color-heading`, `--color-link`, `--color-surface`,
`--color-surface-hover`, `--color-border`, `--color-border-light`, `--color-primary`,
`--color-primary-hover`, `--color-primary-muted`, `--color-accent-bg`, `--color-success`,
`--color-success-bg`, `--color-success-text`, `--color-error`, `--color-error-bg`,
`--color-error-text`, `--color-btn-secondary-bg`, `--color-btn-secondary-text`,
`--color-btn-secondary-hover`, `--color-shadow`, `--color-shadow-hover`,
`--color-shadow-sm`, `--color-checkbox-hover`, `--color-sidebar-shadow`.

Brand hue: `--color-primary` is `#4a6fa5` in light and `#6b94d4` in dark. The only other
non-`--color-` token is `--open` on `.test-sidebar`.

There are **no** spacing, radius, z-index or typography scale tokens — those are hardcoded
`rem`/`px` values. Interactive elements transition over `0.15s`; `body` transitions
`background-color`/`color` over `0.2s ease`.

### Media queries

| Breakpoint | Effect |
|---|---|
| `max-width: 600px` | markdown tables get `overflow-x: auto` |
| `max-width: 600px` | `.flash-grades` collapses to two columns, `.flash-card` padding shrinks, `.settings-section .flash-row` stacks label above control |
| `max-width: 700px` | `.test-layout` and `.test-sidebar` collapse to one column |

## Language of the interface

All user-facing UI strings are **Russian** («Загрузка...», «Изучать правила», «Подтвердить
выбор», «Верно!», «Неверно.», «Отметить как пройденное», «36 уроков · 30 дней тестов»,
«Материал в разработке», ARIA labels such as «пройдено»).
Two exceptions stay English: the home header title and the `index.html` `<title>` are
«Language Learning», and `<html lang="ru">` declares the document language.
Level ids (`A2`, `A2+`, `B1`, `B2`, `B2+`) are not UI copy — they are data and stay verbatim.
`STUDY_TYPE_LABELS` in `lib/types.ts` is Russian and rendered verbatim in study lists:
`rule → Правило`, `vocabulary → Новые слова`, `phrases → Фразы`, `idioms → Идиомы`.

When adding a Russian count to the UI, use `plural()` from `lib/plural.ts` instead of writing
the three forms inline — the `11-14` and `1`/`2-4` exceptions are easy to miss by hand.
Ready-made helpers exist for lessons, test days, flashcards and study materials
(`lessons()`, `testDays()`, `cards()`, `materials()`).

When adding UI copy, keep it Russian. Repo documentation, in contrast, is English.

## E2E tests (`app/e2e/`, `app/playwright.config.ts`)

Chromium-only Playwright suite, run with `npm run e2e` from `app/`. The config
starts the Vite dev server itself (`webServer`, port 5173, `reuseExistingServer`
outside CI), so no manual `dev` is needed. Screenshots are kept only on failure.

- `e2e/smoke.spec.ts` — every route renders: home, level, rules list + one
  study page, tests list, `/flashcards` with its three sections, `/:level/game`
  first round.
- `e2e/flashcards.spec.ts` — the review loop on a clean `localStorage`: the
  answer block is covered (`visibility: hidden`, space reserved) until
  «Показать ответ», grading advances the head card, and `?level=` presets the
  scope.
- `e2e/game.spec.ts` — the game loop on a clean `localStorage`: intro advance,
  level back link to the lobby, lesson entry into the lobby, lobby resume at
  the saved round with stats, restart modal wipe, reload position restore, and a full single-lesson
  session (intro → translation choice → matching via `data-side`/`data-cardid`
  buttons → spelling via `data-answer`/`data-letter` buttons) ending on
  «Сессия завершена!» with `completedGame` persisted, plus a fail-path test
  (3 deliberate mistakes → «Жизни закончились!» → resume from block with full
  hearts and kept progress).
- `e2e/feedback-flash.spec.ts` — ticket #14 guard: a wrong game answer attaches
  the red `.screen-feedback` glow with `.app-shell--shake` and burns one heart,
  even with `reducedMotion: 'reduce'` emulated.

Conventions: drive tests through public pages as a user would; reset
`localStorage` in `beforeEach` (flashcards settings persist); select by visible
Russian copy (`getByRole` + text), not by CSS classes, except for
layout-asserting internals (`.flash-back--covered`, `.flash-answer`,
`.flash-front`).

## Conventions for UI changes

- Reuse `.btn` / `.btn-secondary` / `.btn-danger` / `.btn-sm` rather than inventing variants.
- Disabled buttons must look disabled: `.btn:disabled` and `.action-btn:disabled`
  both render `opacity: 0.6` with a default cursor (a functionally disabled button
  that looks live reads as a bug).
- Any new colour must be a `--color-*` token defined for both `:root` and `[data-theme='dark']`.
- Use `CheckMark` rather than a bare checkbox, so read-only and interactive states stay consistent.
- Route params must stay `encodeURIComponent`-wrapped — `studyKey` contains a colon.
- New pages fetch through `app/src/lib/loadContent.ts` only; never touch `content/` directly.
