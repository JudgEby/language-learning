# Инструкции для ИИ-агентов — платформа изучения английского

Этот проект помогает изучать английский по уровням (B2 и др.). ИИ-агенты генерируют обучающие материалы и тесты на основе извлечённого текста из PDF.

## Структура проекта

```
eng/
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
  "contentMd": "## Present Perfect Simple and Continuous\n\nПростым языком...",
  "examples": ["How long have you been studying English?"]
}
```

- `contentMd` — markdown, объяснения на **русском**, примеры на **английском**
- Стиль: как лучший учитель — просто, с примерами, без академического жаргона

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

## Workflow: «Сгенерируй обучение для уровня B2»

1. Прочитать `content/B2/extract/SB.txt` — основной источник грамматики и структуры уроков
2. Прочитать `content/B2/extract/WB.txt` — дополнительная лексика, фразы, идиомы из Workbook
3. Определить порядок уроков по пособию (1A, 1B, 1C, 2A, …)
4. Для каждого урока создать 4 JSON-файла в `data/rules/`, `data/vocabulary/`, `data/phrases/`, `data/idioms/`
5. Обновить `content/B2/manifest.json`:
   - `studyOrder` — плоский список: rule → vocabulary → phrases → idioms для каждого урока
   - `title` — человекочитаемое название уровня
6. Не перезаписывать `extract/` — только `data/` и `manifest.json`

**Стиль контента:**
- Объяснения правил — простым языком, как лучший учитель
- Примеры предложений — на английском
- Переводы слов/фраз — на русском
- Включать материал из Workbook, где он дополняет урок

---

## Workflow: «Сгенерируй тесты для уровня B2 на N дней по 1 часу»

1. Прочитать сгенерированные правила в `content/B2/data/rules/`
2. Рассчитать ~15–20 вопросов на день (≈1 час)
3. Создать `tests/day-01.json` … `tests/day-NN.json`
4. Каждый вопрос:
   - ≤4 варианта, все на английском
   - `correctIndex` (0-based)
   - `explanation` — почему ответ верный/неверный
   - `relatedRuleIds` — связанные правила
   - `id` — по формуле хэша выше
5. Обновить `manifest.json` → `testDays`: `["day-01", "day-02", ...]`

**Типы вопросов:** выбор правильного предложения, грамматика, лексика в контексте, коллокации.

---

## Workflow: «Правила возьми из такого-то файла»

Пользователь может указать конкретный источник:
- `content/B2/extract/SB.txt` — сырой текст пособия
- `content/B2/data/rules/01-1A-my-id.json` — уже сгенерированное правило
- `KONSPEKT_Speakout_B2.md` — человеческий конспект (референс, не используется приложением)

Использовать указанный файл как основной источник для генерации.

---

## Проверка перед завершением

- [ ] Все JSON валидны
- [ ] `id` в файлах совпадают с именами и `studyOrder`
- [ ] `studyOrder` отражает порядок пособия
- [ ] У каждого теста вычислен `id` по формуле
- [ ] Не более 4 вариантов в каждом вопросе
- [ ] `relatedRuleIds` ссылаются на существующие правила
