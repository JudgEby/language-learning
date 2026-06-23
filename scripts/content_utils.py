# -*- coding: utf-8 -*-
"""Shared helpers for level-agnostic content scripts."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DATA_CATEGORIES = ("rules", "vocabulary", "phrases", "idioms")
STUDY_TYPES = ("rule", "vocabulary", "phrases", "idioms")


def level_dir(level: str) -> Path:
    return CONTENT / level


def data_dir(level: str, category: str) -> Path:
    return level_dir(level) / "data" / category


def tests_dir(level: str) -> Path:
    return level_dir(level) / "tests"


def manifest_path(level: str) -> Path:
    return level_dir(level) / "manifest.json"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def test_id(question: str, options: list[str], correct_index: int) -> str:
    payload = question + "|" + "|".join(options) + "|" + str(correct_index)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:12]


def list_data_files(directory: Path) -> list[Path]:
    return sorted(
        f for f in directory.glob("*.json") if f.name != "index.json"
    )


def lesson_id_from_data(data: dict) -> str | None:
    return data.get("id") or data.get("lessonId")


def find_by_lesson_id(directory: Path, lesson_id: str) -> Path | None:
    for path in list_data_files(directory):
        data = load_json(path)
        if lesson_id_from_data(data) == lesson_id:
            return path
    return None


def load_rules_ordered(level: str) -> list[tuple[Path, dict]]:
    rules_path = data_dir(level, "rules")
    items: list[tuple[Path, dict]] = []
    for path in list_data_files(rules_path):
        data = load_json(path)
        items.append((path, data))
    items.sort(key=lambda pair: (pair[1].get("order", 9999), pair[0].name))
    return items


def rule_ids(level: str) -> set[str]:
    return {
        lesson_id
        for _, data in load_rules_ordered(level)
        if (lesson_id := data.get("id"))
    }


def build_study_order(level: str) -> list[dict[str, str]]:
    order: list[dict[str, str]] = []
    for _, rule in load_rules_ordered(level):
        lesson_id = rule.get("id")
        if not lesson_id:
            continue
        for study_type, category in zip(STUDY_TYPES, DATA_CATEGORIES):
            if find_by_lesson_id(data_dir(level, category), lesson_id):
                order.append({"type": study_type, "id": lesson_id})
    return order


def build_category_index(level: str, category: str) -> list[str]:
    rules = load_rules_ordered(level)
    filenames: list[str] = []
    for rule_path, rule in rules:
        lesson_id = rule.get("id")
        if not lesson_id:
            continue
        match = find_by_lesson_id(data_dir(level, category), lesson_id)
        if match:
            filenames.append(match.name)
        elif category == "rules":
            filenames.append(rule_path.name)
    return filenames


def update_content_index() -> list[str]:
    levels = sorted(
        p.name
        for p in CONTENT.iterdir()
        if p.is_dir() and (p / "manifest.json").is_file()
    )
    write_json(CONTENT / "index.json", levels)
    return levels


def make_question(
    question: str,
    options: list[str],
    correct_index: int,
    explanation: str,
    related_rule_ids: list[str],
) -> dict:
    return {
        "id": test_id(question, options, correct_index),
        "question": question,
        "options": options,
        "correctIndex": correct_index,
        "explanation": explanation,
        "relatedRuleIds": related_rule_ids,
    }


def build_rule_content_md(
    heading: str,
    essence: str,
    how: str,
    live_examples: list[tuple[str, str]],
    lifehack: str,
) -> str:
    """Build contentMd following prompts/rule-generation-style.md structure."""
    lines = [
        f"## {heading}",
        "",
        "### Простая суть",
        "",
        essence,
        "",
        "### Как это работает",
        "",
        how,
        "",
        "### Живые примеры",
        "",
    ]
    for en, ru in live_examples:
        lines.append(f"- {en} — {ru}")
    lines.extend(["", "### Лайфхак для запоминания", "", lifehack])
    return "\n".join(lines)
