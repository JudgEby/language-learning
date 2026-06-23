# -*- coding: utf-8 -*-
"""Validate JSON content and tests for a level."""
from __future__ import annotations

import argparse
import sys

from content_utils import (
    DATA_CATEGORIES,
    build_category_index,
    build_study_order,
    data_dir,
    lesson_id_from_data,
    list_data_files,
    load_json,
    load_rules_ordered,
    manifest_path,
    rule_ids,
    test_id,
    tests_dir,
)


def error(errors: list[str], message: str) -> None:
    errors.append(message)


def validate_rules(level: str, errors: list[str]) -> None:
    seen_ids: set[str] = set()
    for path, data in load_rules_ordered(level):
        lesson_id = data.get("id")
        if not lesson_id:
            error(errors, f"{path}: missing id")
            continue
        if lesson_id in seen_ids:
            error(errors, f"{path}: duplicate rule id {lesson_id}")
        seen_ids.add(lesson_id)
        if not data.get("contentMd"):
            error(errors, f"{path}: missing contentMd")
        if "order" not in data:
            error(errors, f"{path}: missing order")


def validate_lexicon(level: str, category: str, errors: list[str]) -> None:
    rules = rule_ids(level)
    directory = data_dir(level, category)
    for path in list_data_files(directory):
        data = load_json(path)
        lesson_id = lesson_id_from_data(data)
        if not lesson_id:
            error(errors, f"{path}: missing lessonId")
            continue
        if category != "rules" and lesson_id not in rules:
            error(errors, f"{path}: lessonId {lesson_id} has no matching rule")
        items = data.get("items", [])
        if not items:
            error(errors, f"{path}: empty items")
        key = {"vocabulary": "term", "phrases": "phrase", "idioms": "idiom"}[category]
        for i, item in enumerate(items):
            if not item.get(key):
                error(errors, f"{path}: items[{i}] missing {key}")
            if not item.get("translation"):
                error(errors, f"{path}: items[{i}] missing translation")


def validate_manifest(level: str, errors: list[str]) -> None:
    path = manifest_path(level)
    if not path.is_file():
        error(errors, f"Missing {path}")
        return

    manifest = load_json(path)
    if manifest.get("level") != level:
        error(errors, f"{path}: level field should be {level}")

    expected = build_study_order(level)
    actual = manifest.get("studyOrder", [])
    if actual != expected:
        error(
            errors,
            f"{path}: studyOrder is out of sync (run: python scripts/sync_level.py {level})",
        )

    for category in DATA_CATEGORIES:
        index_path = data_dir(level, category) / "index.json"
        if not index_path.is_file():
            error(errors, f"Missing {index_path}")
            continue
        index = load_json(index_path)
        expected_index = build_category_index(level, category)
        if index != expected_index:
            error(
                errors,
                f"{index_path}: out of sync (run: python scripts/sync_level.py {level})",
            )


def validate_tests(level: str, errors: list[str]) -> None:
    manifest = load_json(manifest_path(level))
    rules = rule_ids(level)
    test_days = manifest.get("testDays", [])
    directory = tests_dir(level)

    for day_id in test_days:
        path = directory / f"{day_id}.json"
        if not path.is_file():
            error(errors, f"Missing test file for {day_id}: {path}")
            continue
        questions = load_json(path)
        if not isinstance(questions, list):
            error(errors, f"{path}: expected a JSON array")
            continue
        for i, item in enumerate(questions):
            prefix = f"{path} [{i}]"
            options = item.get("options", [])
            correct = item.get("correctIndex")
            question = item.get("question", "")
            if len(options) > 4:
                error(errors, f"{prefix}: more than 4 options")
            if not options:
                error(errors, f"{prefix}: no options")
            if correct is None or not (0 <= correct < len(options)):
                error(errors, f"{prefix}: invalid correctIndex")
            expected_id = test_id(question, options, correct)
            if item.get("id") != expected_id:
                error(
                    errors,
                    f"{prefix}: id mismatch (expected {expected_id}, "
                    f"run: python scripts/fix_test_ids.py {level})",
                )
            for rid in item.get("relatedRuleIds", []):
                if rid not in rules:
                    error(errors, f"{prefix}: unknown relatedRuleId {rid}")


def validate_level(level: str) -> list[str]:
    errors: list[str] = []
    if not manifest_path(level).is_file():
        error(errors, f"Level not found: content/{level}/manifest.json")
        return errors

    validate_rules(level, errors)
    for category in ("vocabulary", "phrases", "idioms"):
        validate_lexicon(level, category, errors)
    validate_manifest(level, errors)
    validate_tests(level, errors)
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate content JSON for a level.")
    parser.add_argument("level", help="Level id, e.g. B2 or C1")
    args = parser.parse_args()

    errors = validate_level(args.level)
    if errors:
        print(f"FAILED: {len(errors)} issue(s) in {args.level}", file=sys.stderr)
        for item in errors:
            print(f"  - {item}", file=sys.stderr)
        sys.exit(1)

    print(f"OK: {args.level} passed validation")


if __name__ == "__main__":
    main()
