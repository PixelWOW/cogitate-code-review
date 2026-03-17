# backend/config.py
# Global config — NO hardcoded rater fields, only system paths

import platform
from pathlib import Path

# ─── Root directory ───────────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent.parent

# ─── Rater / template / upload directories ────────────────────────────
RATERS_DIR = ROOT_DIR / "raters"
TEMPLATES_DIR = ROOT_DIR / "templates"
UPLOADS_DIR = ROOT_DIR / "dump" / "uploads"

RATERS_DIR.mkdir(exist_ok=True)
TEMPLATES_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ─── LibreOffice binary — auto-detected by OS ────────────────────────
if platform.system() == "Windows":
    LIBREOFFICE_BIN = r"C:\Program Files\LibreOffice\program\soffice.exe"
else:
    LIBREOFFICE_BIN = "libreoffice"
