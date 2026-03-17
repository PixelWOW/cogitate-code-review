# MPL Rater API

Old Republic — Miscellaneous Professional Liability

## Stack
- **FastAPI** + **openpyxl** + **LibreOffice headless**
- Per-request file isolation (no shared Excel state)
- Same code runs locally (Windows) and in production (Docker/Linux)

## Architecture
```
Request → FastAPI → copy template → openpyxl writes inputs
→ LibreOffice recalculates → openpyxl reads outputs → Response
```

## Local Setup

### 1. Install LibreOffice
Download: https://www.libreoffice.org/download/download-libreoffice/
Windows path expected: `C:\Program Files\LibreOffice\program\soffice.exe`

### 2. Install Python deps
```bash
cd mpl-rater/backend
pip install -r requirements.txt
```

### 3. Run the server
```bash
cd mpl-rater/backend
uvicorn main:app --reload --port 8000
```

### 4. Open UI
http://localhost:8000/ui

### 5. API docs
http://localhost:8000/docs

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/calculate` | Write inputs, recalculate, return premium |
| GET | `/options` | Dropdown values for frontend |
| GET | `/health` | Status and template check |

## Tests
```bash
cd mpl-rater
python tests/test_api.py
```
