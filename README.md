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
├── AGENTS.md                 # инструкции для ИИ-агентов (схемы JSON, workflows)
├── prompts/
│   └── rule-generation-style.md  # стиль генерации правил (редактируемый промпт)
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

Сборка production-версии:

```bash
cd app
npm run build
```

## Промпты для ИИ

Скопируйте нужный промпт в чат с агентом. Замените `{LEVEL}` на id вашего курса. Агент должен следовать схемам и workflows из [`AGENTS.md`](AGENTS.md).

### Полное обучение по уровню

```
Прочитай AGENTS.md и prompts/rule-generation-style.md. Сгенерируй обучение для уровня {LEVEL}.

Источники:
- content/{LEVEL}/extract/SB.txt — грамматика и структура уроков
- content/{LEVEL}/extract/WB.txt — дополнительная лексика из Workbook

Сделай:
1. JSON-файлы для всех уроков в content/{LEVEL}/data/rules/, vocabulary/, phrases/, idioms/
2. index.json в каждой подпапке data/
3. Обнови content/{LEVEL}/manifest.json: title — человекочитаемое название курса, studyOrder — плоский список (rule → vocabulary → phrases → idioms для каждого урока)

Правила (contentMd): строго по структуре и тону из prompts/rule-generation-style.md. Лексика/фразы/идиомы: переводы на языке объяснений, примеры на изучаемом языке.
```

### Тесты на N дней

```
Прочитай AGENTS.md и сгенерируй тесты для уровня {LEVEL} на 7 дней по 1 часу (~15–20 вопросов в день).

Источник правил: content/{LEVEL}/data/rules/

Сделай:
1. Файлы content/{LEVEL}/tests/day-01.json … day-07.json
2. В каждом вопросе: ≤4 варианта (на изучаемом языке), explanation, relatedRuleIds, id по формуле хэша из AGENTS.md
3. Обнови content/{LEVEL}/manifest.json → testDays

Вопросы на изучаемом языке. Типы: грамматика, выбор правильного предложения, лексика в контексте, коллокации.
```

### Один урок (дополнение или перегенерация)

```
Прочитай AGENTS.md и prompts/rule-generation-style.md. Сгенерируй обучение для урока {LESSON_ID} уровня {LEVEL}.

Источники: content/{LEVEL}/extract/SB.txt, content/{LEVEL}/extract/WB.txt

Создай или обнови:
- content/{LEVEL}/data/rules/{NN}-{LESSON_ID}.json  (contentMd — по prompts/rule-generation-style.md)
- content/{LEVEL}/data/vocabulary/{NN}-{LESSON_ID}.json
- content/{LEVEL}/data/phrases/{NN}-{LESSON_ID}.json
- content/{LEVEL}/data/idioms/{NN}-{LESSON_ID}.json

Добавь записи в studyOrder manifest.json (rule → vocabulary → phrases → idioms для {LESSON_ID}), не ломая порядок остальных уроков.
```

### Тесты по конкретным правилам

```
Прочитай AGENTS.md. Сгенерируй 10 тестовых вопросов для уровня {LEVEL} по правилам из:
- content/{LEVEL}/data/rules/{файл-1}.json
- content/{LEVEL}/data/rules/{файл-2}.json

Добавь вопросы в content/{LEVEL}/tests/day-01.json (или создай day-02.json, если day-01 уже заполнен).
У каждого вопроса — relatedRuleIds, id по хэшу, не более 4 вариантов ответа.
Обнови testDays в manifest.json.
```

### Новый уровень с нуля

```
Прочитай AGENTS.md. Для уровня {LEVEL}:
1. Предположи, что extract уже выполнен (content/{LEVEL}/extract/SB.txt, WB.txt)
2. Сгенерируй полное обучение и тесты на 5 дней
3. Создай content/index.json с уровнем {LEVEL}, если его там ещё нет
```

### Проверка и исправление контента

```
Прочитай AGENTS.md и проверь content/{LEVEL}/:
- все JSON валидны и соответствуют схемам
- studyOrder в manifest.json совпадает с файлами в data/
- id тестов вычислены по формуле хэша
- index.json актуальны во всех подпапках data/

Исправь найденные несоответствия.
```

### Советы

- Указывайте **конкретные пути к файлам** — агент точнее поймёт источник
- Стиль правил настраивается в [`prompts/rule-generation-style.md`](prompts/rule-generation-style.md) — меняйте промпт там, не в AGENTS.md
- Для больших пособий генерируйте **по юнитам**, а не всё сразу
- После генерации запустите `python scripts/run_app.py` и проверьте материал в приложении

## Приложение

| Экран | Описание |
|-------|----------|
| Главная | Список уровней, для которых есть обучение и/или тесты |
| Уровень | Выбор: изучать правила или проходить тесты |
| Обучение | Плоский нумерованный список: правило → слова → фразы → идиомы (в порядке пособия) |
| Тест | Вопрос слева (до 4 вариантов), кнопка «Правила» справа; подтверждение ответа с подсветкой и объяснением |

Навигация: «К списку» → «К уровню» → «Ко всем уровням».

### Прогресс

Сохраняется в `localStorage` (ключ `language-learning-progress`):

- **Обучение** — отмечается вручную кнопкой «Отметить как пройденное»; ключ вида `rule:{lesson-id}`
- **Тесты** — отмечаются после подтверждения ответа; id = SHA-256 хэш вопроса (первые 12 символов). При изменении теста id меняется, старый прогресс не мешает новым тестам

## Форматы данных

- **Extract из PDF** — `.txt` с маркерами страниц (`--- PAGE N ---`)
- **Данные для приложения** — JSON (см. схемы в [`AGENTS.md`](AGENTS.md))
- **Текст правил** — markdown внутри поля `contentMd` (структура и тон — [`prompts/rule-generation-style.md`](prompts/rule-generation-style.md); объяснения на языке обучения, примеры на изучаемом языке)

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
| `build_rule_md.py` | Собрать `contentMd` по секциям стиля из `prompts/rule-generation-style.md` |

Шаблоны для тестов: [`prompts/test-plan.example.json`](prompts/test-plan.example.json), [`prompts/grammar-questions.example.json`](prompts/grammar-questions.example.json).

Типичный workflow для нового уровня:

1. `python scripts/extract_pdf.py {LEVEL}` — если PDF текстовый, или `python scripts/extract_pdf_ocr.py {LEVEL}` — если PDF сканированный
2. Агент генерирует JSON в `content/{LEVEL}/data/` (и при необходимости тесты)
3. `python scripts/sync_level.py {LEVEL}`
4. `python scripts/validate_level.py {LEVEL}`

Для тестов с автодополнением лексикой: скопируйте `test_plan.example.json` → `content/{LEVEL}/test_plan.json`, положите грамматические вопросы в `content/{LEVEL}/tests/sources/{lessonId}.json`, затем `python scripts/assemble_tests.py {LEVEL}`.

## Добавление нового уровня

1. Создайте `toExtract/{LEVEL}/` и положите туда `SB.pdf` / `WB.pdf`
2. Запустите `python scripts/extract_pdf.py {LEVEL}` (или `extract_pdf_ocr.py` для сканов)
3. Попросите ИИ-агента сгенерировать контент для `{LEVEL}` по `AGENTS.md`
4. `python scripts/sync_level.py {LEVEL} && python scripts/validate_level.py {LEVEL}`
5. Уровень появится на главной странице автоматически
