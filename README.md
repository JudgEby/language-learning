# Language Learning

Локальная платформа для изучения языков по уровням на основе учебных пособий. PDF извлекается в текст, ИИ-агент генерирует правила, лексику и тесты в JSON, React-приложение показывает материалы и отслеживает прогресс.

## Требования

- Python 3.10+
- Node.js 18+
- npm

## Быстрый старт

```bash
# Python-зависимости
pip install -r requirements.txt

# Запуск приложения (установит npm-зависимости при первом запуске)
python scripts/run_app.py
```

Приложение откроется на http://localhost:5173

## Структура проекта

```
├── AGENTS.md                 # инструкции для ИИ-агентов (workflows, команды, Read Map)
├── docs/architecture/        # архитектурная документация (English)
├── .opencode/skills/         # скиллы генерации (lesson content, tests)
├── .opencode/command/        # команды генерации для slash-вызовов
├── toExtract/                # вход: PDF пособий (папки в git, PDF — локально)
│   └── {LEVEL}/
│       ├── SB.pdf            # Student's Book
│       └── WB.pdf            # Workbook
├── content/                  # сгенерированные данные
│   └── {LEVEL}/
│       ├── manifest.json     # метаданные уровня, порядок обучения и тестов
│       ├── extract/          # SB.txt, WB.txt — сырой текст из PDF
│       ├── data/
│       │   ├── rules/        # грамматика и правила
│       │   ├── vocabulary/   # новые слова
│       │   ├── phrases/      # фразы и коллокации
│       │   └── idioms/       # идиомы
│       └── tests/            # day-01.json, day-02.json, ...
├── scripts/
│   ├── extract_pdf.py              # PDF → content/{level}/extract/
│   ├── sync_level.py               # синхронизация studyOrder и index.json
│   ├── validate_level.py           # проверка JSON и тестов
│   ├── fix_test_ids.py             # пересчёт id вопросов тестов
│   ├── generate_vocab_questions.py # автогенерация лексических вопросов
│   ├── assemble_tests.py           # сборка day-NN.json из test_plan.json
│   ├── build_rule_md.py            # шаблон contentMd для правил
│   └── run_app.py                  # запуск dev-сервера
└── app/                      # React-приложение (Vite + TypeScript + Zustand)
```

`{LEVEL}` — идентификатор курса или уровня (латиница, без пробелов): например, папка `content/en-b2/` соответствует id `en-b2`.

## Рабочий процесс

### 1. Добавить пособие

Положите PDF в папку уровня:

```
toExtract/{LEVEL}/SB.pdf
toExtract/{LEVEL}/WB.pdf
```

### 2. Извлечь текст из PDF

```bash
python scripts/extract_pdf.py              # все уровни в toExtract/
python scripts/extract_pdf.py {LEVEL}      # только указанный уровень
```

Результат: `content/{LEVEL}/extract/SB.txt` и `WB.txt`. При первом запуске создаётся скелет папок и `manifest.json`.

Если PDF — сканированные страницы (в полученных `.txt` только маркеры `--- PAGE N ---`), используйте OCR-версию:

```bash
python scripts/extract_pdf_ocr.py              # все уровни
python scripts/extract_pdf_ocr.py {LEVEL}      # только указанный уровень
```

Требуется [Tesseract OCR](https://github.com/tesseract-ocr/tesseract). Скрипт автоматически найдёт его в NormCap, Chocolatey или `C:\Program Files\Tesseract-OCR`. Можно указать путь через переменную окружения `TESSERACT_CMD`.

### 3. Сгенерировать обучение и тесты (ИИ-агент)

Перед запросом откройте [`AGENTS.md`](AGENTS.md) в контексте агента (или укажите агенту прочитать его). Готовые промпты — в разделе [Промпты для ИИ](#промпты-для-ии) ниже.

Агент создаёт JSON-файлы в `content/{LEVEL}/data/` и `content/{LEVEL}/tests/`, обновляет `manifest.json`.

### 4. Синхронизировать и проверить (после генерации агентом)

```bash
python scripts/sync_level.py {LEVEL}       # пересобрать studyOrder и index.json
python scripts/validate_level.py {LEVEL}   # проверить схемы, id тестов, ссылки
python scripts/fix_test_ids.py {LEVEL}     # пересчитать id, если агент ошибся
```

### 5. Запустить приложение

```bash
python scripts/run_app.py
```

Скрипт копирует `content/` в `app/public/content/` и запускает Vite dev-сервер.

Также можно запустить dev-сервер напрямую — копирование не требуется:

```bash
cd app
npm run dev
```

Плагин `content-sync` в [`app/vite.config.ts`](app/vite.config.ts) сам синхронизирует
`content/` → `app/public/content/`: полная копия при старте `dev` и `build`,
далее инкрементально по событиям `add` / `change` / `unlink` с перезагрузкой страницы.

**Правьте только `content/` в корне репозитория.** Папка `app/public/content/`
создаётся автоматически, в `.gitignore` и ручным редактированием не трогается —
изменения будут перезаписаны.

Проверка типов (проект `src` плюс `tsconfig.node.json`: `vite.config.ts`,
`playwright.config.ts`, `e2e/`):

```bash
cd app
npm run typecheck
```

Сквозные тесты в реальном браузере (Chromium, dev-сервер поднимается сам):

```bash
cd app
npm run e2e
```

Сборка production-версии:

```bash
cd app
npm run build
```

## Команды генерации

Workflows генерации живут в `.opencode/command/` — вызывайте их как slash-команды, подставляя id курса вместо `{LEVEL}`. Правила пишет скилл `generate-lesson-content`, тесты — скилл `generate-tests`, фонетические ассоциации для карточек — скилл `generate-mnemonics`. Агент следует схемам и workflows из [`AGENTS.md`](AGENTS.md).

| Команда | Что делает |
|---|---|
| `/generate-level-content {LEVEL}` | Полное обучение по уровню |
| `/generate-lesson {LEVEL} {LESSON_ID}` | Один урок (дополнение или перегенерация) |
| `/generate-test-days {LEVEL} {N}` | Тесты на N дней |
| `/generate-test-questions {LEVEL} {файлы-правил}` | Тесты по конкретным правилам |
| `/scaffold-level {LEVEL}` | Новый уровень с нуля |
| `/validate-content {LEVEL}` | Проверка и исправление контента |

### Советы

- Указывайте **конкретные пути к файлам** — агент точнее поймёт источник
- Стиль правил живёт в скилле `generate-lesson-content` — меняйте его там, не в AGENTS.md
- Для больших пособий генерируйте **по юнитам**, а не всё сразу
- После генерации запустите `python scripts/run_app.py` и проверьте материал в приложении

## Приложение

| Экран | Описание |
|-------|----------|
| Главная | Список уровней, для которых есть обучение и/или тесты |
| Уровень | Выбор: изучать правила, проходить тесты, карточки или играть |
| Обучение | Плоский нумерованный список: правило → слова → фразы → идиомы (в порядке пособия) |
| Тест | Вопрос слева (до 4 вариантов), кнопка «Правила» справа; подтверждение ответа с подсветкой и объяснением |
| Игра | Ассоциативная игра со словами уровня: новые слова, перевод, пары, spelling; 3 жизни, чекпоинты |

Навигация: «К списку» → «К уровню» → «Ко всем уровням».

### Прогресс

Сохраняется в `localStorage` (ключ `language-learning-progress`):

- **Обучение** — отмечается вручную кнопкой «Отметить как пройденное»; ключ вида `rule:{lesson-id}`
- **Тесты** — отмечаются после подтверждения ответа; id = SHA-256 хэш вопроса (первые 12 символов). При изменении теста id меняется, старый прогресс не мешает новым тестам

## Форматы данных

- **Extract из PDF** — `.txt` с маркерами страниц (`--- PAGE N ---`)
- **Данные для приложения** — JSON (см. схемы в [`AGENTS.md`](AGENTS.md))
- **Текст правил** — markdown внутри поля `contentMd` (структура и тон — скилл `generate-lesson-content`; объяснения на языке обучения, примеры на изучаемом языке)

## Скрипты для любого уровня

Все утилиты принимают id уровня первым аргументом.

| Скрипт | Назначение |
|--------|------------|
| `extract_pdf.py [LEVEL]` | Извлечь PDF (текстовые), создать скелет `content/{level}/` |
| `extract_pdf_ocr.py [LEVEL]` | OCR для сканированных PDF (когда `extract_pdf.py` не дал текста) |
| `sync_level.py LEVEL` | Пересобрать `studyOrder` и `data/*/index.json` из файлов уроков |
| `validate_level.py LEVEL` | Проверить JSON, `studyOrder`, id тестов, `relatedRuleIds` |
| `fix_test_ids.py LEVEL` | Пересчитать SHA-256 id во всех `tests/day-*.json` |
| `generate_vocab_questions.py LEVEL` | Сгенерировать вопросы по лексике/фразам (stdout или `--output`) |
| `assemble_tests.py LEVEL` | Собрать тесты из `test_plan.json` + опциональных `tests/sources/` |
| `build_rule_md.py` | Собрать `contentMd` по секциям стиля из скилла `generate-lesson-content` |

Шаблоны для тестов лежат в скилле `generate-tests`: `.opencode/skills/generate-tests/references/test-plan.example.json`, `grammar-questions.example.json`.

Типичный workflow для нового уровня:

1. `python scripts/extract_pdf.py {LEVEL}` — если PDF текстовый, или `python scripts/extract_pdf_ocr.py {LEVEL}` — если PDF сканированный
2. Агент генерирует JSON в `content/{LEVEL}/data/` (и при необходимости тесты)
3. `python scripts/sync_level.py {LEVEL}`
4. `python scripts/validate_level.py {LEVEL}`

Для тестов с автодополнением лексикой: скопируйте `.opencode/skills/generate-tests/references/test-plan.example.json` → `content/{LEVEL}/test_plan.json`, положите грамматические вопросы в `content/{LEVEL}/tests/sources/{lessonId}.json`, затем `python scripts/assemble_tests.py {LEVEL}`.

## Добавление нового уровня

1. Создайте `toExtract/{LEVEL}/` и положите туда `SB.pdf` / `WB.pdf`
2. Запустите `python scripts/extract_pdf.py {LEVEL}` (или `extract_pdf_ocr.py` для сканов)
3. Попросите ИИ-агента сгенерировать контент для `{LEVEL}` по `AGENTS.md`
4. `python scripts/sync_level.py {LEVEL} && python scripts/validate_level.py {LEVEL}`
5. Уровень появится на главной странице автоматически
