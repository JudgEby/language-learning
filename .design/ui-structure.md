# UI Structure

## Entry and providers

`app/src/main.tsx` mounts `<App/>` into `#root` with `StrictMode`. It imports
`./index.css` and registers no providers.

`app/src/App.tsx` composes the provider stack and the route table:

```
ThemeProvider          (app/src/components/ThemeProvider.tsx)
└── BrowserRouter
    ├── ThemeToggle     (fixed top-right, z-index 100, sibling of <main>)
    └── main.app-shell (max-width 960px, centered)
        └── <Routes>
```

There is **no** error boundary, **no** 404 fallback route, and **no** lazy loading or code
splitting. `StudyViewPage` is deliberately reused for two routes and distinguishes them by
whether `dayId` is present in the params.

## Route table

| Path | Component | Purpose |
|---|---|---|
| `/` | `HomePage` | level list |
| `/:level` | `LevelPage` | choose study or tests |
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
`PageHeader title="Language Learning"` with `Logo` (48×31), then `ul.card-list` of
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
`testDays.length`, otherwise «Для этого уровня пока нет материалов.»

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
  item.idiom ?? ''`, the translation, and the example in `.lexicon-example`.

Footer: primary button `markStudyComplete` (disabled and relabelled «Отмечено как
пройденное» once done) plus a secondary back button navigating to `listPath`, which is
`/{level}/tests/{dayId}/study` in the day context and `/{level}/rules` otherwise.

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
| `Layout.tsx` | `BackLink`, `PageHeader`, `CheckMark` | despite the filename there is **no** `Layout` export |
| `ConfirmModal.tsx` | `ConfirmModal` | controlled; returns `null` when closed |
| `ThemeProvider.tsx` | `ThemeProvider` | effect-only sync, passes children through unchanged |
| `ThemeToggle.tsx` | `ThemeToggle` | fixed top-right button |
| `Logo.tsx` | `Logo`, `LogoProps` | two "L" glyphs, neon gradient `#ff1493 → #8338ec → #fb5607 → #ffbe0b` |

`BackLink({to, label})` renders `.back-link` with a `← ` prefix. `PageHeader({title, backTo,
backLabel, actions})` renders `.page-header`, `.page-header__row`, `.page-header__actions`.
`CheckMark({done, onChange?})` is **dual-mode**: with `onChange` it renders a visually hidden
native checkbox inside `label.study-checkbox` (icon state driven by `--done`) so keyboard and
screen-reader users get a real control; without `onChange` it renders a read-only
`.check-mark`. `CheckIcon()` is a 24×24 inline SVG with path `M20 6L9 17l-5-5`,
`stroke="currentColor"`.

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

When adding UI copy, keep it Russian. Repo documentation, in contrast, is English.

## Conventions for UI changes

- Reuse `.btn` / `.btn-secondary` / `.btn-danger` / `.btn-sm` rather than inventing variants.
- Any new colour must be a `--color-*` token defined for both `:root` and `[data-theme='dark']`.
- Use `CheckMark` rather than a bare checkbox, so read-only and interactive states stay consistent.
- Route params must stay `encodeURIComponent`-wrapped — `studyKey` contains a colon.
- New pages fetch through `app/src/lib/loadContent.ts` only; never touch `content/` directly.
