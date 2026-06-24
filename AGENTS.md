# Инструкции для ИИ-агентов — Language Learning

Платформа для изучения языков по уровням. ИИ-агенты генерируют обучающие материалы и тесты на основе извлечённого текста из PDF.

## Структура проекта

```
├── prompts/
│   └── rule-generation-style.md  # промпт стиля для генерации правил (редактируемый)
├── toExtract/{LEVEL}/          # PDF пособий (SB.pdf, WB.pdf) — локально; папки в git
├── content/{LEVEL}/            # сгенерированные данные
│   ├── manifest.json           # метаданные уровня, порядок обучения и тестов
│   ├── extract/                # SB.txt, WB.txt (сырой текст из PDF)
│   ├── data/
│   │   ├── rules/              # грамматика и правила
│   │   ├── vocabulary/         # новые слова
│   │   ├── phrases/            # фразы и коллокации
│   │   └── idioms/             # идиомы
│   └── tests/                  # day-01.json, day-02.json, ...
└── app/                        # React-приложение (читает content/)
```

`{LEVEL}` — id курса (латиница, без пробелов).

## Именование файлов

- Префикс с порядковым номером: `01-lesson-slug.json`, `02-another-lesson.json`
- `id` внутри JSON — slug урока: `lesson-slug`, `another-lesson` (без префикса)
- Один файл на урок в каждой категории (rules, vocabulary, phrases, idioms)

## JSON-схемы

### manifest.json

```json
{
  "level": "LEVEL_ID",
  "title": "Course title",
  "source": { "sb": "extract/SB.txt", "wb": "extract/WB.txt" },
  "studyOrder": [
    { "type": "rule", "id": "lesson-slug" },
    { "type": "vocabulary", "id": "lesson-slug" },
    { "type": "phrases", "id": "lesson-slug" },
    { "type": "idioms", "id": "lesson-slug" },
    { "type": "rule", "id": "another-lesson" }
  ],
  "testDays": ["day-01", "day-02"]
}
```

`studyOrder` — **плоский** список элементов для UI: для каждого урока порядок rule → vocabulary → phrases → idioms.

Ключ прогресса в приложении: `{type}:{id}` → `rule:lesson-slug`, `vocabulary:lesson-slug`.

### Правило — data/rules/01-lesson-slug.json

```json
{
  "id": "lesson-slug",
  "order": 1,
  "unit": "Unit 1 — Topic",
  "title": "Lesson title",
  "contentMd": "## Grammar topic\n\n### Простая суть\n\n...",
  "examples": ["Example sentence in the target language."]
}
```

- `contentMd` — markdown: объяснения на **языке обучения** (родной или пояснительный), примеры на **изучаемом языке**
- **Стиль и структура** — всегда следуй [`prompts/rule-generation-style.md`](prompts/rule-generation-style.md): секции «Простая суть», «Как это работает», «Живые примеры», «Лайфхак для запоминания»

### Лексика — data/vocabulary/01-lesson-slug.json

```json
{
  "lessonId": "lesson-slug",
  "title": "Lesson title — новые слова",
  "items": [
    { "term": "word", "translation": "перевод", "example": "Example sentence." }
  ]
}
```

### Фразы — data/phrases/01-lesson-slug.json

```json
{
  "lessonId": "lesson-slug",
  "title": "Lesson title — фразы",
  "items": [
    { "phrase": "collocation", "translation": "перевод", "example": "Example sentence." }
  ]
}
```

### Идиомы — data/idioms/01-lesson-slug.json

```json
{
  "lessonId": "lesson-slug",
  "title": "Lesson title — идиомы",
  "items": [
    { "idiom": "idiom", "translation": "перевод", "example": "Example sentence." }
  ]
}
```

### Тест — tests/day-01.json (массив вопросов)

```json
[
  {
    "id": "a3f8c2b91e4d",
    "question": "Which sentence is correct?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 1,
    "explanation": "Brief explanation of the correct answer.",
    "relatedRuleIds": ["lesson-slug"]
  }
]
```

- Вопрос и варианты — на **изучаемом языке**
- Не более **4** вариантов ответа
- `explanation` — на изучаемом языке (можно кратко на языке обучения в скобках)
- `relatedRuleIds` — id правил, к которым относится вопрос

### Формула id теста

```
SHA-256(question + "|" + options.join("|") + "|" + correctIndex)
```

Взять первые **12** hex-символов. Пример на Python:

```python
import hashlib

def test_id(question: str, options: list[str], correct_index: int) -> str:
    payload = question + "|" + "|".join(options) + "|" + str(correct_index)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12]
```

При изменении вопроса id меняется — старый прогресс в localStorage не мешает новым тестам.

---

## Workflow: «Сгенерируй обучение для уровня {LEVEL}»

1. Прочитать **`prompts/rule-generation-style.md`** — обязательный стиль для поля `contentMd` в правилах
2. Прочитать `content/{LEVEL}/extract/SB.txt` — основной источник грамматики и структуры уроков
3. Прочитать `content/{LEVEL}/extract/WB.txt` — дополнительная лексика, фразы, идиомы из Workbook
4. Определить порядок уроков по пособию
5. Для каждого урока создать 4 JSON-файла в `data/rules/`, `data/vocabulary/`, `data/phrases/`, `data/idioms/`
6. Обновить `content/{LEVEL}/manifest.json`:
   - `title` — человекочитаемое название курса
   - `studyOrder` — можно пересобрать: `python scripts/sync_level.py {LEVEL}`
7. Не перезаписывать `extract/` — только `data/` и `manifest.json`
8. Проверить: `python scripts/validate_level.py {LEVEL}`

**Стиль контента:**
- Правила (`contentMd`) — строго по `prompts/rule-generation-style.md`
- Примеры предложений в правилах — на изучаемом языке
- Переводы слов/фраз — на языке обучения
- Включать материал из Workbook, где он дополняет урок

---

## Workflow: «Сгенерируй тесты для уровня {LEVEL} на N дней»

**Вариант A — агент пишет тесты целиком:**

1. Прочитать правила в `content/{LEVEL}/data/rules/`
2. Рассчитать ~15–20 вопросов на день (≈1 час)
3. Создать `tests/day-01.json` … `tests/day-NN.json`
4. Каждый вопрос: ≤4 варианта, `correctIndex`, `explanation`, `relatedRuleIds`, `id` по формуле хэша
5. Обновить `manifest.json` → `testDays`
6. `python scripts/fix_test_ids.py {LEVEL}` и `python scripts/validate_level.py {LEVEL}`

**Вариант B — сборка из плана + лексика:**

1. Скопировать шаблон `prompts/test-plan.example.json` → `content/{LEVEL}/test_plan.json`
2. Грамматические вопросы (без `id`) — в `content/{LEVEL}/tests/sources/{lessonId}.json` (см. `prompts/grammar-questions.example.json`)
3. `python scripts/assemble_tests.py {LEVEL}` — дополнит дни лексическими вопросами из vocabulary/phrases
4. `python scripts/validate_level.py {LEVEL}`

**Типы вопросов:** выбор правильного предложения, грамматика, лексика в контексте, коллокации.

---

## Workflow: «Правила возьми из такого-то файла»

Перед генерацией прочитать **`prompts/rule-generation-style.md`**.

Пользователь может указать конкретный источник:
- `content/{LEVEL}/extract/SB.txt` — сырой текст пособия
- `content/{LEVEL}/data/rules/{NN}-{lesson-id}.json` — уже сгенерированное правило

Использовать указанный файл как основной источник для генерации; переписать грамматику в `contentMd` по промпту стиля.

---

## Проверка перед завершением

Запустить `python scripts/validate_level.py {LEVEL}` или вручную:

- [ ] Все JSON валидны
- [ ] `id` в файлах совпадают с именами и `studyOrder`
- [ ] `studyOrder` отражает порядок пособия (`sync_level.py` при необходимости)
- [ ] У каждого теста вычислен `id` по формуле (`fix_test_ids.py` при необходимости)
- [ ] Не более 4 вариантов в каждом вопросе
- [ ] `relatedRuleIds` ссылаются на существующие правила
