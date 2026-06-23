# -*- coding: utf-8 -*-
"""Assemble test day files from test_plan.json and optional grammar sources."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from content_utils import (
    level_dir,
    load_json,
    manifest_path,
    rule_ids,
    tests_dir,
    write_json,
)
from generate_vocab_questions import vocab_questions


def load_grammar_sources(level: str, lesson_id: str) -> list[dict]:
    path = tests_dir(level) / "sources" / f"{lesson_id}.json"
    if not path.is_file():
        return []
    data = load_json(path)
    if not isinstance(data, list):
        raise ValueError(f"{path}: expected a JSON array")
    return data


def normalize_question(item: dict) -> dict:
    required = {"question", "options", "correctIndex", "explanation", "relatedRuleIds"}
    missing = required - item.keys()
    if missing:
        raise ValueError(f"Question missing fields: {sorted(missing)}")
    if len(item["options"]) > 4:
        raise ValueError("Question has more than 4 options")
    from content_utils import make_question

    return make_question(
        item["question"],
        item["options"],
        item["correctIndex"],
        item["explanation"],
        item["relatedRuleIds"],
    )


def build_day(level: str, lesson_ids: list[str], target: int) -> list[dict]:
    per_lesson = target // len(lesson_ids)
    extra = target % len(lesson_ids)
    questions: list[dict] = []

    for i, lesson_id in enumerate(lesson_ids):
        need = per_lesson + (1 if i < extra else 0)
        grammar = [normalize_question(q) for q in load_grammar_sources(level, lesson_id)]
        lesson_q = grammar[:need]
        if len(lesson_q) < need:
            lesson_q.extend(vocab_questions(level, lesson_id, need - len(lesson_q)))
        questions.extend(lesson_q[:need])

    return questions


def assemble_tests(level: str, plan_path: Path | None = None) -> list[str]:
    root = level_dir(level)
    plan_file = plan_path or root / "test_plan.json"
    if not plan_file.is_file():
        raise FileNotFoundError(f"Missing test plan: {plan_file}")

    plan = load_json(plan_file)
    questions_per_day = plan.get("questionsPerDay", 20)
    days = plan.get("days", [])
    if not days:
        raise ValueError(f"{plan_file}: days must be a non-empty array")

    rules = rule_ids(level)
    test_days: list[str] = []
    out_dir = tests_dir(level)
    out_dir.mkdir(parents=True, exist_ok=True)

    for day_num, lesson_ids in enumerate(days, start=1):
        if not lesson_ids:
            raise ValueError(f"Day {day_num}: empty lesson list")
        for lesson_id in lesson_ids:
            if lesson_id not in rules:
                raise ValueError(f"Day {day_num}: unknown lesson {lesson_id}")

        day_id = f"day-{day_num:02d}"
        questions = build_day(level, lesson_ids, questions_per_day)
        if len(questions) != questions_per_day:
            raise ValueError(
                f"{day_id}: expected {questions_per_day} questions, got {len(questions)}"
            )

        write_json(out_dir / f"{day_id}.json", questions)
        test_days.append(day_id)
        print(f"Wrote {day_id}.json: {len(questions)} questions")

    manifest = load_json(manifest_path(level))
    manifest["testDays"] = test_days
    write_json(manifest_path(level), manifest)
    print(f"Updated manifest testDays: {test_days}")
    return test_days


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Build tests/day-NN.json from test_plan.json. "
            "Grammar questions: tests/sources/{lessonId}.json (optional). "
            "Remaining slots filled from vocabulary/phrases."
        )
    )
    parser.add_argument("level", help="Level id, e.g. B2 or C1")
    parser.add_argument(
        "--plan",
        type=Path,
        help="Path to test_plan.json (default: content/{level}/test_plan.json)",
    )
    args = parser.parse_args()

    try:
        assemble_tests(args.level, args.plan)
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
