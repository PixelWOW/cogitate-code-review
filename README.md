# MPL Rater (Converted Architecture)

This repository now uses an apps-based structure for backend, frontend, and model data.

## Final Structure

```
mpl-rater/
	cogitate rater/
		backend/        # FastAPI service
		web-next/       # Next.js frontend (App Router)
		raters/         # Approved/live raters
		templates/      # Test/staging raters
		dump/           # Temporary uploads and utilities
	start-backend.bat
	start-frontend.bat
```

## Stack

- Backend: FastAPI + openpyxl + LibreOffice headless
- Frontend: Next.js + TypeScript
- Storage: File-based model directories under apps

## Runtime Flow

```
Browser -> Next.js UI -> FastAPI API -> Excel template copy/write/recalc/read -> JSON response
```

## Local Setup

### 1) Install LibreOffice

Download: https://www.libreoffice.org/download/download-libreoffice/

Expected default Windows binary:

```
C:\Program Files\LibreOffice\program\soffice.exe
```

### 2) Install backend dependencies

```bash
cd "e:\mpl-rater\cogitate rater\backend"
pip install -r requirements.txt
```

### 3) Install frontend dependencies

```bash
cd "e:\mpl-rater\cogitate rater\web-next"
npm install
```

## Start Commands

### Recommended scripts

```bash
cd e:\mpl-rater
start-backend.bat
```

```bash
cd e:\mpl-rater
start-frontend.bat
```

Both scripts run foreground processes and can be stopped with Ctrl+C.

### Manual backend start

```bash
cd "e:\mpl-rater\cogitate rater\backend"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Manual frontend start

```bash
cd "e:\mpl-rater\cogitate rater\web-next"
npm run dev
```

## URLs

- Frontend home: http://localhost:3000
- Tester page: http://localhost:3000/tester
- Admin page: http://localhost:3000/admin
- Backend docs: http://localhost:8000/docs
- Backend health: http://localhost:8000/api/health

## API Surface (Current)

- GET /api/raters
- GET /api/raters/{slug}/config
- POST /api/raters/{slug}/calculate
- POST /api/raters/{slug}/calculate-and-download
- GET /api/templates
- GET /api/templates/{name}/config
- POST /api/templates/{name}/calculate
- POST /api/templates/{name}/calculate-and-download
- POST /api/admin/upload
- POST /api/admin/test-calculate
- POST /api/admin/test-download
- POST /api/admin/save

### Save Endpoint Notes

POST /api/admin/save now supports source selection:

- source=raters -> save under cogitate rater/raters/{slug}
- source=templates -> save under cogitate rater/templates/{slug}

## Build Checks

Frontend production build:

```bash
cd "e:\mpl-rater\cogitate rater\web-next"
npm run build
```

Backend syntax check:

```bash
cd e:\mpl-rater
python -m py_compile "cogitate rater/backend/main.py" "cogitate rater/backend/config.py" "cogitate rater/backend/registry.py"
```

## Developer Baseline

Use [CONVERSION_REFERENCE.md](CONVERSION_REFERENCE.md) as the source-of-truth for:

- file-by-file responsibilities
- conversion history
- current contracts
- extension points for new features
