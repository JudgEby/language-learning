# -*- coding: utf-8 -*-
"""Print rule contentMd in the standard style (for agents or manual use)."""
from __future__ import annotations

import argparse
import json
import sys

from content_utils import build_rule_content_md


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build contentMd markdown for a grammar rule."
    )
    parser.add_argument("--heading", required=True, help="## heading text")
    parser.add_argument("--essence", required=True, help="Простая суть section")
    parser.add_argument("--how", required=True, help="Как это работает section")
    parser.add_argument(
        "--example",
        action="append",
        nargs=2,
        metavar=("EN", "RU"),
        dest="examples",
        help='Live example pair: --example "She **has left**." "Она ушла."',
    )
    parser.add_argument("--lifehack", required=True, help="Лайфхак section")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output JSON with contentMd and examples fields",
    )
    args = parser.parse_args()

    examples = args.examples or []
    content_md = build_rule_content_md(
        args.heading,
        args.essence,
        args.how,
        examples,
        args.lifehack,
    )

    if args.json:
        payload = {
            "contentMd": content_md,
            "examples": [en for en, _ in examples[:4]],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(content_md)


if __name__ == "__main__":
    main()
