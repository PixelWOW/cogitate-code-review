# backend/config.py
# Global config — NO hardcoded rater fields, only system paths

import platform
from pathlib import Path

# ─── App/data root directory ──────────────────────────────────────────
APPS_DIR = Path(__file__).resolve().parent.parent
if not APPS_DIR.exists():
    APPS_DIR = Path(__file__).resolve().parent.parent.parent

# Backward compatibility: if data folders are still at repo root, keep working.
if not (APPS_DIR / "raters").exists() and (APPS_DIR.parent / "raters").exists():
    APPS_DIR = APPS_DIR.parent

# ─── Rater / template / upload directories ────────────────────────────
RATERS_DIR = APPS_DIR / "raters"
TEMPLATES_DIR = APPS_DIR / "templates"
UPLOADS_DIR = APPS_DIR / "dump" / "uploads"

RATERS_DIR.mkdir(exist_ok=True)
TEMPLATES_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ─── LibreOffice binary — auto-detected by OS ────────────────────────
if platform.system() == "Windows":
    LIBREOFFICE_BIN = r"C:\Program Files\LibreOffice\program\soffice.exe"
else:
    LIBREOFFICE_BIN = "libreoffice"
