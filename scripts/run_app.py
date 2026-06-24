# -*- coding: utf-8 -*-
"""Start the React dev server for the Language Learning app."""
from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_DIR = ROOT / "app"
CONTENT_SRC = ROOT / "content"
CONTENT_DST = APP_DIR / "public" / "content"


def npm_cmd(*args: str) -> list[str]:
    npm = shutil.which("npm")
    if not npm:
        print("npm not found in PATH. Install Node.js: https://nodejs.org/")
        sys.exit(1)
    return [npm, *args]


def sync_content() -> None:
    if not CONTENT_SRC.is_dir():
        print(f"Missing {CONTENT_SRC}")
        return
    if CONTENT_DST.exists():
        shutil.rmtree(CONTENT_DST)
    shutil.copytree(CONTENT_SRC, CONTENT_DST)
    print(f"Synced {CONTENT_SRC} -> {CONTENT_DST}")


def main() -> None:
    if not APP_DIR.is_dir():
        print(f"Missing app directory: {APP_DIR}")
        sys.exit(1)

    sync_content()

    if not (APP_DIR / "node_modules").is_dir():
        print("Installing npm dependencies...")
        subprocess.run(npm_cmd("install"), cwd=APP_DIR, check=True)

    print("Starting dev server at http://localhost:5173")
    subprocess.run(npm_cmd("run", "dev"), cwd=APP_DIR, check=True)


if __name__ == "__main__":
    main()
