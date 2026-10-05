# A2 content: 36 rules, 6 idiom lessons, 12 test days

Date: 2026-10-05
Level: `A2` (*Speakout 2nd Edition Elementary*, 12 units)

## Goal

`content/A2/` currently holds only `manifest.json` with empty `studyOrder` / `testDays`
and four empty `data/*/index.json`. The level is listed in `content/index.json` and
renders in the app, but has no material. After this work A2 is a fully working level:
rules, vocabulary, phrases, idioms and 12 test days.

## Source

- `content/A2/extract/SB.txt` — 428 KB, 91 pages, textbook with 12 units
- `content/A2/extract/WB.txt` — 261 KB, workbook (word lists, extra grammar notes)

The text-layer extraction interleaves columns, so sections are read per unit page
range instead of by blind search. Workbook lists are the primary vocabulary source.

Unit titles: 1 (title missing in the TOC page), 2 LIFESTYLE, 3 PEOPLE, 4 PLACES,
5 FOOD, 6 THE PAST, 7 HOLIDAYS, 8 NOW, 9 TRANSPORT, 10 PLANS, 11 HEALTH,
12 EXPERIENCES.

## Granularity

Each unit has three numbered sections `X.1`, `X.2`, `X.3` (vocabulary + grammar) plus a
fourth video/functional spread. One rule per section: **36 rules**, numbered 1–36 in
textbook order.

## Lesson map

Titles and grammar focus taken from the contents pages; section 1.2 and 5.1 titles were
confirmed in the body (`SEE IT TASTE IT!`, `MY FRIDGE`).

| # | Unit | Section | Slug | Grammar / function |
|---|---|---|---|---|
| 1 | 1 WELCOME | Nice to meet you | `nice-to-meet-you` | present simple: be; countries and nationalities |
| 2 | 1 WELCOME | See it! Taste it! | `see-it-taste-it` | this/that, these/those; objects; possessives |
| 3 | 1 WELCOME | Can I have a coffee? | `can-i-have-a-coffee` | making requests; tourist places |
| 4 | 2 LIFESTYLE | Join us! | `join-us` | and/but/or; activities; groups |
| 5 | 2 LIFESTYLE | High flyers | `high-flyers` | present simple he/she/it; jobs; third person -s |
| 6 | 2 LIFESTYLE | What time does it start? | `what-time-does-it-start` | asking for information; times |
| 7 | 3 PEOPLE | Big happy families | `big-happy-families` | have/has got; family |
| 8 | 3 PEOPLE | Real friends? | `real-friends` | adverbs of frequency; personality |
| 9 | 3 PEOPLE | Are you free tonight? | `are-you-free-tonight` | making arrangements; time expressions |
| 10 | 4 PLACES | A place to stay | `a-place-to-stay` | there is/are; rooms and furniture; prepositions |
| 11 | 4 PLACES | Around town | `around-town` | can/can't for possibility; places in towns; prepositions |
| 12 | 4 PLACES | Can I help you? | `can-i-help-you` | shopping; things to buy; polite intonation |
| 13 | 5 FOOD | My fridge | `my-fridge` | countable and uncountable nouns; food and drink |
| 14 | 5 FOOD | A lifetime in containers | `a-lifetime-in-containers` | numbers; how much/many; quantifiers |
| 15 | 5 FOOD | Are you ready to order? | `are-you-ready-to-order` | polite intonation; linking; restaurant words |
| 16 | 6 THE PAST | In their past | `in-their-past` | was/were; dates and time phrases |
| 17 | 6 THE PAST | Time twins | `time-twins` | past simple; life story collocations |
| 18 | 6 THE PAST | What did you do? | `what-did-you-do` | asking follow-up questions; activities |
| 19 | 7 HOLIDAYS | Travel partners | `travel-partners` | comparatives; travel adjectives |
| 20 | 7 HOLIDAYS | The longest bike ride | `the-longest-bike-ride` | superlatives; places |
| 21 | 7 HOLIDAYS | Can you tell me the way? | `can-you-tell-me-the-way` | giving directions |
| 22 | 8 NOW | Having a great time | `having-a-great-time` | present continuous; verbs + prepositions |
| 23 | 8 NOW | What a difference! | `what-a-difference` | present simple and present continuous; appearance |
| 24 | 8 NOW | What do you recommend? | `what-do-you-recommend` | recommending; types of film |
| 25 | 9 TRANSPORT | City bikes | `city-bikes` | can/can't, have to/don't have to; adjectives |
| 26 | 9 TRANSPORT | Free ride | `free-ride` | articles a/an/the/no article; transport collocations |
| 27 | 9 TRANSPORT | Sorry I'm late | `sorry-im-late` | apologising; excuses |
| 28 | 10 PLANS | Life's a lottery | `lifes-a-lottery` | be going to; would like to; plans |
| 29 | 10 PLANS | Survive | `survive` | will, might (not), won't; phrases with get |
| 30 | 10 PLANS | Let's do something new | `lets-do-something-new` | making suggestions; art and culture |
| 31 | 11 HEALTH | I don't feel well | `i-dont-feel-well` | should/shouldn't; the body; health |
| 32 | 11 HEALTH | One thing at a time | `one-thing-at-a-time` | adverbs; communication |
| 33 | 11 HEALTH | Help! | `help` | offering to help; verbs of movement |
| 34 | 12 EXPERIENCES | Great experiences | `great-experiences` | present perfect; experiences |
| 35 | 12 EXPERIENCES | Afraid of nothing | `afraid-of-nothing` | present perfect and past simple |
| 36 | 12 EXPERIENCES | Hello, I've got a problem | `hello-ive-got-a-problem` | telephoning; prepositions |

Idiom lessons: `join-us`, `are-you-ready-to-order`, `can-you-tell-me-the-way`,
`having-a-great-time`, `survive`, `afraid-of-nothing`.

## Files

| Path | Count | Shape |
|---|---|---|
| `data/rules/NN-<slug>.json` | 36 | `order` 1–36, `unit: "Unit N — TITLE"`, `contentMd` per `prompts/rule-generation-style.md`, 4–5 `examples` |
| `data/vocabulary/NN-<slug>.json` | 36 | 8–14 items `{term, translation, example}` |
| `data/phrases/NN-<slug>.json` | 36 | 6–10 items `{phrase, translation, example}` |
| `data/idioms/NN-<slug>.json` | 6 | 4–6 items, Units 2, 5, 7, 8, 10, 12 (mirrors A2+, which has idioms for 6 of 37 lessons) |
| `tests/sources/<slug>.json` | 36 | 8 grammar questions each, no `id` field |

`<slug>` is derived from the section title (`big-happy-families`, `real-friends`,
`are-you-free-tonight`); `lessonId` equals the slug.

## Tests

`content/A2/test_plan.json`:

```json
{
  "questionsPerDay": 20,
  "days": [["<lesson-1>", "<lesson-2>", "<lesson-3>"], ...12 days]
}
```

One day per unit (three consecutive lessons). `assemble_tests.build_day` splits 20 as
7/7/6, so each lesson needs at least 7 grammar questions — 8 are written to keep margin.
The remainder is filled by `vocab_questions` from the lesson's own vocabulary and phrases
(no level-wide fallback exists), so every lesson keeps at least a few items with an
`example`. Question `id`s are computed by `make_question` inside the assembler; nothing
is hashed by hand.

Result: 288 hand-written grammar questions plus roughly 240 generated
vocabulary/phrase questions across `tests/day-01.json` … `day-12.json`.

## Execution order

1. Read SB/WB per unit, map the 36 sections to slugs
2. Per unit: 3 × (rule + vocabulary + phrases), idioms where planned
3. `python scripts/sync_level.py A2` — rebuilds `studyOrder` and `data/*/index.json`
4. `tests/sources/*.json` — 8 grammar questions per lesson
5. `python scripts/assemble_tests.py A2` — writes `day-01..12`, updates `manifest.testDays`
6. `python scripts/validate_level.py A2`
7. Smoke test in the app: A2 opens, rules render, a test day completes

## Risks

- `SB.txt` columns are interleaved; grammar notes are read per section and cross-checked
  against the workbook.
- Volume: ~200 KB of rule and lexicon JSON plus ~150 KB of questions. Written in
  per-unit batches, not in one pass.
- No architecture change, so `.design/` and `AGENTS.md` stay untouched.

## Verification

- `python scripts/validate_level.py A2` — zero errors
- `day-NN.json` files hold exactly 20 questions, `id` matches the hash formula,
  `relatedRuleIds` resolve
- `manifest.studyOrder` contains rule → vocabulary → phrases per lesson in textbook order