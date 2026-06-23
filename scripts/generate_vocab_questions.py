# -*- coding: utf-8 -*-
"""Generate vocabulary and collocation test questions from lexicon JSON."""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

from content_utils import (
    data_dir,
    find_by_lesson_id,
    list_data_files,
    load_json,
    make_question,
    rule_ids,
    write_json,
)


def collect_distractors(level: str, exclude: str) -> list[str]:
    terms: list[str] = []
    for category in ("vocabulary", "phrases"):
        for path in list_data_files(data_dir(level, category)):
            data = load_json(path)
            key = "term" if category == "vocabulary" else "phrase"
            for item in data.get("items", []):
                value = item.get(key, "")
                if value and value.lower() != exclude.lower():
                    terms.append(value)
    return terms


def vocab_questions(level: str, lesson_id: str, count: int) -> list[dict]:
    pool: list[tuple[str, str, str, str]] = []

    vocab_path = find_by_lesson_id(data_dir(level, "vocabulary"), lesson_id)
    if vocab_path:
        for item in load_json(vocab_path).get("items", []):
            term = item.get("term", "")
            example = item.get("example", "")
            trans = item.get("translation", "")
            if term and example:
                pool.append(("vocab", term, example, trans))

    phrases_path = find_by_lesson_id(data_dir(level, "phrases"), lesson_id)
    if phrases_path:
        for item in load_json(phrases_path).get("items", []):
            phrase = item.get("phrase", "")
            example = item.get("example", "")
            trans = item.get("translation", "")
            if phrase and example:
                pool.append(("phrase", phrase, example, trans))

    if not pool:
        return []

    rng = random.Random(hash(f"{level}:{lesson_id}") & 0xFFFFFFFF)
    rng.shuffle(pool)

    questions: list[dict] = []
    for kind, term, example, trans in pool[:count]:
        distractors = collect_distractors(level, term)
        rng.shuffle(distractors)

        if kind == "vocab":
            question = f"Which word means '{trans}'?"
            options = [term] + distractors[:3]
            rng.shuffle(options)
            explanation = f"'{term}' means {trans}. Example: {example}"
        else:
            blanked = example.replace(term, "___")
            question = (
                f"Complete the sentence: {blanked}"
                if blanked != example
                else f"Choose the correct collocation: {example}"
            )
            options = [term] + distractors[:3]
            rng.shuffle(options)
            explanation = f"'{term}' ({trans}). Full sentence: {example}"

        questions.append(
            make_question(
                question,
                options,
                options.index(term),
                explanation,
                [lesson_id],
            )
        )

    return questions[:count]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate vocab/phrase questions from lesson lexicon files."
    )
    parser.add_argument("level", help="Level id, e.g. B2 or C1")
    parser.add_argument(
        "--lesson",
        action="append",
        dest="lessons",
        metavar="ID",
        help="Lesson id (repeatable), e.g. 1A-my-id",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=5,
        help="Questions per lesson (default: 5)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Write JSON array to file instead of stdout",
    )
    args = parser.parse_args()

    lessons = args.lessons or sorted(rule_ids(args.level))
    if not lessons:
        print(f"No rules found for level {args.level}", file=sys.stderr)
        sys.exit(1)

    all_questions: list[dict] = []
    for lesson_id in lessons:
        if lesson_id not in rule_ids(args.level):
            print(f"Unknown lesson: {lesson_id}", file=sys.stderr)
            sys.exit(1)
        all_questions.extend(vocab_questions(args.level, lesson_id, args.count))

    if args.output:
        write_json(args.output, all_questions)
        print(f"Wrote {len(all_questions)} questions to {args.output}")
    else:
        print(json.dumps(all_questions, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
