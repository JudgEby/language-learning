"""Extract text from scanned PDFs using OCR.

Usage:
    python scripts/extract_pdf_ocr.py [LEVEL]

If LEVEL is omitted, processes all levels in toExtract/.
Use this when extract_pdf.py produces empty files (scanned PDFs).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import fitz
import pytesseract
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
TO_EXTRACT = ROOT / "toExtract"
CONTENT = ROOT / "content"

PDF_NAMES = {"sb": "SB.pdf", "wb": "WB.pdf"}
DATA_SUBDIRS = ("rules", "vocabulary", "phrases", "idioms")


def _find_tesseract() -> str | None:
    """Locate tesseract executable."""
    # 1 — env var
    env_cmd = os.environ.get("TESSERACT_CMD")
    if env_cmd and Path(env_cmd).is_file():
        return env_cmd
    # 2 — common locations
    candidates = [
        # NormCap (bundled)
        Path(os.environ.get("LOCALAPPDATA", ""))
        / "Programs" / "NormCap" / "app" / "normcap" / "resources"
        / "tesseract" / "tesseract.exe",
        # Chocolatey
        Path("C:/Program Files/Tesseract-OCR/tesseract.exe"),
        # Manual install
        Path("C:/Program Files (x86)/Tesseract-OCR/tesseract.exe"),
    ]
    for p in candidates:
        if p.is_file():
            return str(p.resolve())
    return None


TESSERACT_CMD = _find_tesseract()

if TESSERACT_CMD is None:
    print(
        "ERROR: tesseract not found. Install Tesseract OCR or set TESSERACT_CMD env var.",
        file=sys.stderr,
    )
    sys.exit(1)

TESSERACT_DIR = Path(TESSERACT_CMD).parent
TESSDATA_DIR = (
    # NormCap layout: bin/../resources/tessdata
    TESSERACT_DIR.parent / "tessdata"
)
if not (TESSDATA_DIR / "eng.traineddata").is_file():
    # Search siblings of the tesseract directory
    for sibling in TESSERACT_DIR.parent.iterdir():
        if sibling.is_dir() and (sibling / "eng.traineddata").is_file():
            TESSDATA_DIR = sibling
            break
os.environ["TESSDATA_PREFIX"] = str(TESSDATA_DIR)
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def find_pdf(level_dir: Path, kind: str) -> Path | None:
    target = PDF_NAMES[kind].lower()
    for path in level_dir.iterdir():
        if path.is_file() and path.name.lower() == target:
            return path
    return None


def ocr_page(page: fitz.Page, dpi: int = 250) -> str:
    """Render a PDF page to an image and run OCR."""
    pix = page.get_pixmap(dpi=dpi)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    return pytesseract.image_to_string(img, lang="eng").strip()


def extract_pdf(pdf_path: Path, txt_path: Path) -> None:
    """Iterate pages and OCR each one."""
    doc = fitz.open(str(pdf_path))
    parts: list[str] = []
    total = doc.page_count
    for i in range(total):
        text = ocr_page(doc[i])
        parts.append(f"\n\n--- PAGE {i + 1} ---\n\n")
        parts.append(text)
        if (i + 1) % 10 == 0:
            print(f"    page {i + 1}/{total}")
    doc.close()
    txt_path.parent.mkdir(parents=True, exist_ok=True)
    txt_path.write_text("".join(parts), encoding="utf-8", errors="replace")
    size = txt_path.stat().st_size
    print(f"  Wrote {txt_path} ({size} bytes)")


def ensure_skeleton(level: str) -> None:
    """Create manifest and folders if they don't exist."""
    level_dir = CONTENT / level
    for sub in DATA_SUBDIRS:
        (level_dir / "data" / sub).mkdir(parents=True, exist_ok=True)
    (level_dir / "tests").mkdir(parents=True, exist_ok=True)

    manifest_path = level_dir / "manifest.json"
    if manifest_path.exists():
        _update_content_index()
        return

    source: dict[str, str] = {}
    if (level_dir / "extract" / "SB.txt").exists():
        source["sb"] = "extract/SB.txt"
    if (level_dir / "extract" / "WB.txt").exists():
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
    print(f"  Created {manifest_path}")
    _update_content_index()


def _update_content_index() -> None:
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
    print(f"\nProcessing {level} ...")

    sb_pdf = find_pdf(level_dir, "sb")
    if sb_pdf:
        print(f"  SB: {sb_pdf.name}")
        extract_pdf(sb_pdf, CONTENT / level / "extract" / "SB.txt")

    wb_pdf = find_pdf(level_dir, "wb")
    if wb_pdf:
        print(f"  WB: {wb_pdf.name}")
        extract_pdf(wb_pdf, CONTENT / level / "extract" / "WB.txt")

    if not sb_pdf and not wb_pdf:
        print(f"  Skip {level}: no SB.pdf or WB.pdf found")
        return

    ensure_skeleton(level)


def main() -> None:
    if not TO_EXTRACT.is_dir():
        print(f"Missing input folder: {TO_EXTRACT}", file=sys.stderr)
        sys.exit(1)

    levels = sorted(p for p in TO_EXTRACT.iterdir() if p.is_dir())

    if len(sys.argv) > 1:
        filter_name = sys.argv[1]
        levels = [p for p in levels if p.name == filter_name]
        if not levels:
            print(f"Level not found: {filter_name}", file=sys.stderr)
            sys.exit(1)

    if not levels:
        print("No level folders in toExtract/", file=sys.stderr)
        sys.exit(0)

    for level_dir in levels:
        print(f"Tesseract: {TESSERACT_CMD}")
        process_level(level_dir)

    print("\nDone.")


if __name__ == "__main__":
    main()
