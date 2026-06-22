# -*- coding: utf-8 -*-
"""Extract text from PDFs in toExtract/{level}/ to content/{level}/extract/."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
TO_EXTRACT = ROOT / "toExtract"
CONTENT = ROOT / "content"

PDF_NAMES = {"sb": "SB.pdf", "wb": "WB.pdf"}
DATA_SUBDIRS = ("rules", "vocabulary", "phrases", "idioms")


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


def find_pdf(level_dir: Path, kind: str) -> Path | None:
    target = PDF_NAMES[kind].lower()
    for path in level_dir.iterdir():
        if path.is_file() and path.name.lower() == target:
            return path
    return None


def ensure_skeleton(level: str, has_sb: bool, has_wb: bool) -> None:
    level_dir = CONTENT / level
    for sub in DATA_SUBDIRS:
        (level_dir / "data" / sub).mkdir(parents=True, exist_ok=True)
    (level_dir / "tests").mkdir(parents=True, exist_ok=True)

    manifest_path = level_dir / "manifest.json"
    if manifest_path.exists():
        update_content_index()
        return

    source: dict[str, str] = {}
    if has_sb:
        source["sb"] = "extract/SB.txt"
    if has_wb:
        source["wb"] = "extract/WB.txt"

    manifest = {
        "level": level,
        "title": level,
        "source": source,
        "studyOrder": [],
        "testDays": [],
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Created {manifest_path}")
    update_content_index()


def update_content_index() -> None:
    levels = sorted(
        p.name
        for p in CONTENT.iterdir()
        if p.is_dir() and (p / "manifest.json").is_file()
    )
    index_path = CONTENT / "index.json"
    index_path.write_text(
        json.dumps(levels, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def process_level(level_dir: Path) -> None:
    level = level_dir.name
    has_sb = False
    has_wb = False

    sb_pdf = find_pdf(level_dir, "sb")
    if sb_pdf:
        extract_pdf(sb_pdf, CONTENT / level / "extract" / "SB.txt")
        has_sb = True

    wb_pdf = find_pdf(level_dir, "wb")
    if wb_pdf:
        extract_pdf(wb_pdf, CONTENT / level / "extract" / "WB.txt")
        has_wb = True

    if not has_sb and not has_wb:
        print(f"Skip {level}: no SB.pdf or WB.pdf found")
        return

    ensure_skeleton(level, has_sb, has_wb)


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
