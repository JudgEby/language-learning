# Инструкции для ИИ-агентов — платформа изучения английского

Этот проект помогает изучать английский по уровням (B2 и др.). ИИ-агенты генерируют обучающие материалы и тесты на основе извлечённого текста из PDF.

## Структура проекта

```
eng/
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

## Именование файлов

- Префикс с порядковым номером: `01-1A-my-id.json`, `02-1B-memory.json`
- `id` внутри JSON — slug урока: `1A-my-id`, `1B-memory` (без префикса)
- Один файл на урок в каждой категории (rules, vocabulary, phrases, idioms)

## JSON-схемы

### manifest.json

```json
{
  "level": "B2",
  "title": "Speakout B2",
  "source": { "sb": "extract/SB.txt", "wb": "extract/WB.txt" },
  "studyOrder": [
    { "type": "rule", "id": "1A-my-id" },
    { "type": "vocabulary", "id": "1A-my-id" },
    { "type": "phrases", "id": "1A-my-id" },
    { "type": "idioms", "id": "1A-my-id" },
    { "type": "rule", "id": "1B-memory" }
  ],
  "testDays": ["day-01", "day-02"]
}
```

`studyOrder` — **плоский** список элементов для UI: для каждого урока порядок rule → vocabulary → phrases → idioms.

Ключ прогресса в приложении: `{type}:{id}` → `rule:1A-my-id`, `vocabulary:1A-my-id`.

### Правило — data/rules/01-1A-my-id.json

```json
{
  "id": "1A-my-id",
  "order": 1,
  "unit": "Unit 1 — Identity",
  "title": "My ID",
  "contentMd": "## Present Perfect Simple and Continuous\n\n### Простая суть\n\n...",
  "examples": ["How long have you been studying English?"]
}
```

- `contentMd` — markdown, объяснения на **русском**, примеры на **английском**
- **Стиль и структура** — всегда следуй [`prompts/rule-generation-style.md`](prompts/rule-generation-style.md): секции «Простая суть», «Как это работает», «Живые примеры», «Лайфхак для запоминания»

### Лексика — data/vocabulary/01-1A-my-id.json

```json
{
  "lessonId": "1A-my-id",
  "title": "My ID — новые слова",
  "items": [
    { "term": "reliable", "translation": "надёжный", "example": "She is very reliable." }
  ]
}
```

### Фразы — data/phrases/01-1A-my-id.json

```json
{
  "lessonId": "1A-my-id",
  "title": "My ID — фразы",
  "items": [
    { "phrase": "take after (sb)", "translation": "быть похожим на (родственника)", "example": "She takes after her mother." }
  ]
}
```

### Идиомы — data/idioms/01-1A-my-id.json

```json
{
  "lessonId": "1A-my-id",
  "title": "My ID — идиомы",
  "items": [
    { "idiom": "eye-opener", "translation": "открыло глаза", "example": "The trip was a real eye-opener." }
  ]
}
```

### Тест — tests/day-01.json (массив вопросов)

```json
[
  {
    "id": "a3f8c2b91e4d",
    "question": "Which sentence is correct?",
    "options": ["I have been knowing him", "I have known him", "I am knowing him", "I know him since 2020"],
    "correctIndex": 1,
    "explanation": "State verbs like 'know' are not used in continuous forms.",
    "relatedRuleIds": ["1A-my-id"]
  }
]
```

- Вопрос и варианты — на **английском**
- Не более **4** вариантов ответа
- `explanation` — на английском (можно кратко на русском в скобках)
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
4. Определить порядок уроков по пособию (1A, 1B, 1C, 2A, …)
5. Для каждого урока создать 4 JSON-файла в `data/rules/`, `data/vocabulary/`, `data/phrases/`, `data/idioms/`
6. Обновить `content/{LEVEL}/manifest.json`:
   - `title` — человекочитаемое название уровня
   - `studyOrder` — можно пересобрать: `python scripts/sync_level.py {LEVEL}`
7. Не перезаписывать `extract/` — только `data/` и `manifest.json`
8. Проверить: `python scripts/validate_level.py {LEVEL}`

**Стиль контента:**
- Правила (`contentMd`) — строго по `prompts/rule-generation-style.md`
- Примеры предложений в правилах — на английском
- Переводы слов/фраз — на русском
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
- `content/B2/extract/SB.txt` — сырой текст пособия
- `content/B2/data/rules/01-1A-my-id.json` — уже сгенерированное правило

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
