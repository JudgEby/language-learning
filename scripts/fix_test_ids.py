# -*- coding: utf-8 -*-
"""Recompute test question ids from question text and options."""
from __future__ import annotations

import argparse
import sys

from content_utils import load_json, manifest_path, test_id, tests_dir, write_json


def fix_test_ids(level: str) -> int:
    manifest = load_json(manifest_path(level))
    fixed = 0
    for day_id in manifest.get("testDays", []):
        path = tests_dir(level) / f"{day_id}.json"
        if not path.is_file():
            print(f"Skip missing {path.name}", file=sys.stderr)
            continue
        questions = load_json(path)
        changed = False
        for item in questions:
            new_id = test_id(
                item["question"],
                item["options"],
                item["correctIndex"],
            )
            if item.get("id") != new_id:
                item["id"] = new_id
                fixed += 1
                changed = True
        if changed:
            write_json(path, questions)
            print(f"Updated {path.name}")
    return fixed


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Recompute SHA-256 test ids for all test days of a level."
    )
    parser.add_argument("level", help="Level id, e.g. B2 or C1")
    args = parser.parse_args()

    if not manifest_path(args.level).is_file():
        print(f"Level not found: {args.level}", file=sys.stderr)
        sys.exit(1)

    count = fix_test_ids(args.level)
    print(f"Fixed {count} question id(s) in {args.level}")


if __name__ == "__main__":
    main()
