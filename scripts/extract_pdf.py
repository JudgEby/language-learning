# -*- coding: utf-8 -*-
"""Extract text from PDFs in toExtract/{level}/ to content/{level}/extract/."""
from __future__ import annotations

import sys
from pathlib import Path

from pypdf import PdfReader

from content_utils import CONTENT, TO_EXTRACT, ensure_skeleton, find_pdf


def extract_pdf(pdf_path: Path, txt_path: Path) -> None:
    reader = PdfReader(str(pdf_path))
    parts: list[str] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        parts.append(f"\n\n--- PAGE {i + 1} ---\n\n")
        parts.append(text)
    txt_path.parent.mkdir(parents=True, exist_ok=True)
    txt_path.write_text("".join(parts), encoding="utf-8", errors="replace")
    print(f"Wrote {txt_path} ({txt_path.stat().st_size} bytes)")


def process_level(level_dir: Path) -> None:
    level = level_dir.name
    source: dict[str, str] = {}

    sb_pdf = find_pdf(level_dir, "sb")
    if sb_pdf:
        extract_pdf(sb_pdf, CONTENT / level / "extract" / "SB.txt")
        source["sb"] = "extract/SB.txt"

    wb_pdf = find_pdf(level_dir, "wb")
    if wb_pdf:
        extract_pdf(wb_pdf, CONTENT / level / "extract" / "WB.txt")
        source["wb"] = "extract/WB.txt"

    if not source:
        print(f"Skip {level}: no SB.pdf or WB.pdf found")
        return

    ensure_skeleton(level, source)


def main() -> None:
    if not TO_EXTRACT.is_dir():
        print(f"Missing {TO_EXTRACT}")
        sys.exit(1)

    levels = sorted(p for p in TO_EXTRACT.iterdir() if p.is_dir())
    if len(sys.argv) > 1:
        filter_name = sys.argv[1]
        levels = [p for p in levels if p.name == filter_name]
        if not levels:
            print(f"Level not found: {filter_name}")
            sys.exit(1)

    if not levels:
        print(f"No level folders in {TO_EXTRACT}")
        sys.exit(0)

    for level_dir in levels:
        print(f"Processing {level_dir.name}...")
        process_level(level_dir)


if __name__ == "__main__":
    main()
