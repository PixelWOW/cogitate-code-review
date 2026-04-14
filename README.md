# Cogitate Merged App

This directory combines:
- Backend and rating functionality from `cogitate-code-review/cogitate rater/backend`
- Frontend UI from `alt-frontend-prototype`

## Structure

- `backend/` FastAPI + Excel rating engine
- `frontend/` React + Vite application

## Run Backend

```powershell
Set-Location "d:\Project\Cogitate Rater AI\cogitate-merged-app\backend"
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Run Frontend

```powershell
Set-Location "d:\Project\Cogitate Rater AI\cogitate-merged-app\frontend"
npm install
npm run dev
```

Frontend uses `VITE_API_BASE_URL` from `frontend/.env.local`.
If not set, it defaults to `http://127.0.0.1:8000`.

## Connected Flows

- Load raters/templates from backend: `GET /api/raters`, `GET /api/templates`
- Upload and save workbook as rater: `POST /api/admin/upload`, `POST /api/admin/save`
- Run calculations from Admin Test and Client Calculator:
  - `POST /api/raters/{slug}/calculate`
  - `POST /api/templates/{name}/calculate`
