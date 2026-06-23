# -*- coding: utf-8 -*-
"""Rebuild manifest studyOrder and data/*/index.json for a content level."""
from __future__ import annotations

import argparse
import sys

from content_utils import (
    DATA_CATEGORIES,
    build_category_index,
    build_study_order,
    load_json,
    manifest_path,
    update_content_index,
    write_json,
)


def sync_level(level: str) -> None:
    path = manifest_path(level)
    if not path.is_file():
        print(f"Missing manifest: {path}", file=sys.stderr)
        sys.exit(1)

    manifest = load_json(path)
    manifest["level"] = level
    manifest["studyOrder"] = build_study_order(level)

    for category in DATA_CATEGORIES:
        index = build_category_index(level, category)
        write_json(path.parent / "data" / category / "index.json", index)
        print(f"  {category}/index.json: {len(index)} files")

    write_json(path, manifest)
    levels = update_content_index()
    print(f"Updated {path}")
    print(f"studyOrder: {len(manifest['studyOrder'])} entries")
    print(f"content/index.json: {levels}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sync studyOrder and category indices from lesson files."
    )
    parser.add_argument("level", help="Level id, e.g. B2 or C1")
    args = parser.parse_args()
    print(f"Syncing {args.level}...")
    sync_level(args.level)


if __name__ == "__main__":
    main()
