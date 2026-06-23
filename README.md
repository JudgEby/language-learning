# Платформа для изучения английского

Локальный проект для изучения английского по уровням (B2 и др.) на основе учебных пособий. PDF извлекается в текст, ИИ-агент генерирует правила, лексику и тесты в JSON, React-приложение показывает материалы и отслеживает прогресс.

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
eng/
├── AGENTS.md                 # инструкции для ИИ-агентов (схемы JSON, workflows)
├── prompts/
│   └── rule-generation-style.md  # стиль генерации правил (редактируемый промпт)
├── toExtract/                # вход: PDF пособий (папки в git, PDF — локально)
│   └── B2/
│       ├── SB.pdf            # Student's Book
│       └── WB.pdf            # Workbook
├── content/                  # сгенерированные данные
│   └── B2/
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

## Рабочий процесс

### 1. Добавить пособие

Положите PDF в папку уровня:

```
toExtract/B2/SB.pdf
toExtract/B2/WB.pdf
```

### 2. Извлечь текст из PDF

```bash
python scripts/extract_pdf.py          # все уровни в toExtract/
python scripts/extract_pdf.py B2       # только B2
```

Результат: `content/B2/extract/SB.txt` и `WB.txt`. При первом запуске создаётся скелет папок и `manifest.json`.

### 3. Сгенерировать обучение и тесты (ИИ-агент)

Перед запросом откройте [`AGENTS.md`](AGENTS.md) в контексте агента (или укажите агенту прочитать его). Готовые промпты — в разделе [Промпты для ИИ](#промпты-для-ии) ниже.

Агент создаёт JSON-файлы в `content/B2/data/` и `content/B2/tests/`, обновляет `manifest.json`.

Референс для первой генерации: [`KONSPEKT_Speakout_B2.md`](KONSPEKT_Speakout_B2.md) (приложение его не читает).

### 4. Синхронизировать и проверить (после генерации агентом)

```bash
python scripts/sync_level.py B2       # пересобрать studyOrder и index.json
python scripts/validate_level.py B2   # проверить схемы, id тестов, ссылки
python scripts/fix_test_ids.py B2     # пересчитать id, если агент ошибся
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

Скопируйте нужный промпт в чат с агентом. Замените `B2` на свой уровень при необходимости. Агент должен следовать схемам и workflows из [`AGENTS.md`](AGENTS.md).

### Полное обучение по уровню

```
Прочитай AGENTS.md и prompts/rule-generation-style.md. Сгенерируй обучение для уровня B2.

Источники:
- content/B2/extract/SB.txt — грамматика и структура уроков
- content/B2/extract/WB.txt — дополнительная лексика из Workbook

Сделай:
1. JSON-файлы для всех уроков в content/B2/data/rules/, vocabulary/, phrases/, idioms/
2. index.json в каждой подпапке data/
3. Обнови content/B2/manifest.json: title = "Speakout B2", studyOrder — плоский список (rule → vocabulary → phrases → idioms для каждого урока)

Правила (contentMd): строго по структуре и тону из prompts/rule-generation-style.md. Лексика/фразы/идиомы: объяснения на русском, примеры на английском.
```

### Тесты на N дней

```
Прочитай AGENTS.md и сгенерируй тесты для уровня B2 на 7 дней по 1 часу (~15–20 вопросов в день).

Источник правил: content/B2/data/rules/

Сделай:
1. Файлы content/B2/tests/day-01.json … day-07.json
2. В каждом вопросе: ≤4 варианта (английский), explanation, relatedRuleIds, id по формуле хэша из AGENTS.md
3. Обнови content/B2/manifest.json → testDays

Вопросы на английском. Типы: грамматика, выбор правильного предложения, лексика в контексте, коллокации.
```

### Один урок (дополнение или перегенерация)

```
Прочитай AGENTS.md и prompts/rule-generation-style.md. Сгенерируй обучение для урока 1A My ID уровня B2.

Источники: content/B2/extract/SB.txt, content/B2/extract/WB.txt

Создай или обнови:
- content/B2/data/rules/01-1A-my-id.json  (contentMd — по prompts/rule-generation-style.md)
- content/B2/data/vocabulary/01-1A-my-id.json
- content/B2/data/phrases/01-1A-my-id.json
- content/B2/data/idioms/01-1A-my-id.json

Добавь записи в studyOrder manifest.json (rule → vocabulary → phrases → idioms для 1A-my-id), не ломая порядок остальных уроков.
```

### Тесты по конкретным правилам

```
Прочитай AGENTS.md. Сгенерируй 10 тестовых вопросов для уровня B2 по правилам из:
- content/B2/data/rules/01-1A-my-id.json
- content/B2/data/rules/02-1B-memory.json

Добавь вопросы в content/B2/tests/day-01.json (или создай day-02.json, если day-01 уже заполнен).
У каждого вопроса — relatedRuleIds, id по хэшу, не более 4 вариантов ответа.
Обнови testDays в manifest.json.
```

### Новый уровень с нуля

```
Прочитай AGENTS.md. Для уровня C1:
1. Предположи, что extract уже выполнен (content/C1/extract/SB.txt, WB.txt)
2. Сгенерируй полное обучение и тесты на 5 дней
3. Создай content/index.json с уровнем C1, если его там ещё нет
```

### Проверка и исправление контента

```
Прочитай AGENTS.md и проверь content/B2/:
- все JSON валидны и соответствуют схемам
- studyOrder в manifest.json совпадает с файлами в data/
- id тестов вычислены по формуле хэша
- index.json актуальны во всех подпапках data/

Исправь найденные несоответствия.
```

### Советы

- Указывайте **конкретные пути к файлам** — агент точнее поймёт источник
- Стиль правил настраивается в [`prompts/rule-generation-style.md`](prompts/rule-generation-style.md) — меняйте промпт там, не в AGENTS.md
- Для больших пособий генерируйте **по юнитам** (Unit 1, Unit 2…), а не всё сразу
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

Сохраняется в `localStorage` (ключ `eng-progress`):

- **Обучение** — отмечается вручную кнопкой «Отметить как пройденное»; ключ вида `rule:1A-my-id`
- **Тесты** — отмечаются после подтверждения ответа; id = SHA-256 хэш вопроса (первые 12 символов). При изменении теста id меняется, старый прогресс не мешает новым тестам

## Форматы данных

- **Extract из PDF** — `.txt` с маркерами страниц (`--- PAGE N ---`)
- **Данные для приложения** — JSON (см. схемы в [`AGENTS.md`](AGENTS.md))
- **Текст правил** — markdown внутри поля `contentMd` (структура и тон — [`prompts/rule-generation-style.md`](prompts/rule-generation-style.md); объяснения на русском, примеры на английском)

## Скрипты для любого уровня

Все утилиты принимают id уровня первым аргументом (`B2`, `C1`, …).

| Скрипт | Назначение |
|--------|------------|
| `extract_pdf.py [LEVEL]` | Извлечь PDF, создать скелет `content/{level}/` |
| `sync_level.py LEVEL` | Пересобрать `studyOrder` и `data/*/index.json` из файлов уроков |
| `validate_level.py LEVEL` | Проверить JSON, `studyOrder`, id тестов, `relatedRuleIds` |
| `fix_test_ids.py LEVEL` | Пересчитать SHA-256 id во всех `tests/day-*.json` |
| `generate_vocab_questions.py LEVEL` | Сгенерировать вопросы по лексике/фразам (stdout или `--output`) |
| `assemble_tests.py LEVEL` | Собрать тесты из `test_plan.json` + опциональных `tests/sources/` |
| `build_rule_md.py` | Собрать `contentMd` по секциям стиля из `prompts/rule-generation-style.md` |

Шаблоны для тестов: [`prompts/test-plan.example.json`](prompts/test-plan.example.json), [`prompts/grammar-questions.example.json`](prompts/grammar-questions.example.json).

Типичный workflow для нового уровня:

1. `python scripts/extract_pdf.py C1`
2. Агент генерирует JSON в `content/C1/data/` (и при необходимости тесты)
3. `python scripts/sync_level.py C1`
4. `python scripts/validate_level.py C1`

Для тестов с автодополнением лексикой: скопируйте `test_plan.example.json` → `content/C1/test_plan.json`, положите грамматические вопросы в `content/C1/tests/sources/{lessonId}.json`, затем `python scripts/assemble_tests.py C1`.

## Добавление нового уровня

1. Создайте `toExtract/C1/` и положите туда `SB.pdf` / `WB.pdf`
2. Запустите `python scripts/extract_pdf.py C1`
3. Попросите ИИ-агента сгенерировать контент для C1 по `AGENTS.md`
4. `python scripts/sync_level.py C1 && python scripts/validate_level.py C1`
5. Уровень появится на главной странице автоматически
