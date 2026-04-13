# -*- coding: utf-8 -*-
"""Extract text from SB.pdf / WB.pdf to UTF-8 .txt for search / notes."""
from pathlib import Path

from pypdf import PdfReader


def extract(pdf_path: Path, txt_path: Path) -> None:
    reader = PdfReader(str(pdf_path))
    parts: list[str] = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        parts.append(f"\n\n--- PAGE {i + 1} ---\n\n")
        parts.append(text)
    txt_path.write_text("".join(parts), encoding="utf-8", errors="replace")
    print(f"Wrote {txt_path} ({txt_path.stat().st_size} bytes)")


if __name__ == "__main__":
    base = Path(__file__).resolve().parent
    extract(base / "SB.pdf", base / "SB_extracted.txt")
    extract(base / "WB.pdf", base / "WB_extracted.txt")
