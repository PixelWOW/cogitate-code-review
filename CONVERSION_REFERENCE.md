# MPL-Rater Conversion Reference

## Purpose

This document is the single source of truth for the conversion from the legacy mixed structure to the final apps-based architecture. It is designed so new features can be built safely without rediscovering path decisions, API behavior, or responsibilities.

## Final Repository Layout

```
E:/mpl-rater
  cogitate rater/
    backend/
      config.py
      engine.py
      main.py
      registry.py
      schema_parser.py
      requirements.txt
    web-next/
      src/
        app/
        components/
        lib/
        types/
    raters/
    templates/
    dump/
  start-backend.bat
  start-backend.sh
  start-frontend.bat
  README.md
  STARTUP_GUIDE.md
  CONVERSION_REFERENCE.md
```

## What Was Converted

1. Backend moved from root backend to cogitate rater/backend.
2. Legacy frontend folder was removed in favor of cogitate rater/web-next.
3. Data folders moved under apps:
  - raters -> cogitate rater/raters
  - templates -> cogitate rater/templates
  - dump -> cogitate rater/dump
4. Startup scripts were updated to use apps paths and foreground execution for Ctrl+C stop behavior.
5. Admin save flow was fixed so selected source (raters/templates) is honored by backend.
6. Admin save form was completed with missing fields:
   - Display Name
   - Description

## Important Behavior Changes

### 1) Save destination is source-aware

Endpoint: POST /api/admin/save

Now accepted payload includes:
- upload_id
- config
- slug
- name
- description
- source (raters or templates)

Result:
- source=raters saves under apps/raters/{slug}
- source=templates saves under apps/templates/{slug}

### 2) Backend root route

Backend root redirects to /docs (instead of legacy static UI path).

### 3) Data root resolution

Backend path config prefers apps-level storage directories and keeps fallback logic for compatibility.

## File-by-File Responsibilities

## Root level

### README.md
- High-level system entry point.
- Current architecture, startup commands, and API overview.

### STARTUP_GUIDE.md
- Operator runbook for local startup and troubleshooting.
- Includes backend/frontend launch and common error patterns.

### start-backend.bat
- Windows launcher for backend.
- Runs from cogitate rater/backend.
- Foreground process (Ctrl+C to stop).

### start-backend.sh
- Unix launcher for backend.
- Runs from cogitate rater/backend.
- Foreground process (Ctrl+C to stop).

### start-frontend.bat
- Windows launcher for frontend.
- Runs from cogitate rater/web-next.
- Foreground process (Ctrl+C to stop).

## cogitate rater/backend

### config.py
- Central path and environment configuration.
- Defines storage directories:
  - apps/raters
  - apps/templates
  - apps/dump/uploads
- Defines LibreOffice binary path.

### main.py
- FastAPI app and all API routes.
- Main surface for rater/test/admin operations.
- Contains:
  - health endpoint
  - rater and template list/config/calculate routes
  - admin upload/test/save routes

### registry.py
- Discovers and loads raters/templates from configured directories.
- Reads config.json/meta.json/template.xlsx.

### schema_parser.py
- Parses _Schema worksheet from uploaded Excel into runtime config.
- Builds input/output definitions.
- Injects schedule mode metadata when detected.

### engine.py
- Calculation engine.
- Copies template, writes inputs, runs LibreOffice recalc, reads outputs.
- Supports schedule write path and output-file return mode.

### requirements.txt
- Python dependency list for backend runtime.

## cogitate rater/web-next/src/app

### app/page.tsx
- Landing page/navigation.

### app/tester/page.tsx
- Tester workflow orchestration.
- Source selection, rater config load, calculate, download.

### app/admin/page.tsx
- Admin workflow orchestration.
- Upload -> parse -> test calculate -> test download -> save.
- Includes backend health indicator.
- Includes save fields: slug, display name, description, destination source.

## cogitate rater/web-next/src/components/tester

### SourceSelector.tsx
- Source dropdown for raters/templates.

### RaterSelector.tsx
- Fetches and displays available raters/templates for selected source.

### DynamicForm.tsx
- Renders config-driven form fields and schedule rows.
- Collects normalized input payload.

### OutputPanel.tsx
- Displays result outputs from calculate/test calls.

## cogitate rater/web-next/src/lib

### api-client.ts
- Shared API utilities.
- Supports GET/POST and multipart upload with helpful errors.

## cogitate rater/web-next/src/types

### rater.ts
- Shared frontend types for config, fields, responses, and source enum.

## Data Folder Contracts

## cogitate rater/raters/{slug}
Required files:
- template.xlsx
- config.json
- meta.json

Used for approved/live raters.

## cogitate rater/templates/{slug}
Required files:
- template.xlsx
- config.json
- meta.json (recommended)

Used for test/staging raters.

## cogitate rater/dump/uploads
- Temporary uploaded files for admin test/save flow.

## Current API Contracts

### GET /api/raters
Lists approved raters from cogitate rater/raters.

### GET /api/templates
Lists test raters from cogitate rater/templates.

### GET /api/{source}/{slug}/config
Returns config.json for selected source.

### POST /api/{source}/{slug}/calculate
Runs calculation and returns outputs.

### POST /api/{source}/{slug}/calculate-and-download
Runs calculation and returns output workbook file.

### POST /api/admin/upload
Accepts .xlsx upload and returns parsed config + upload_id.

### POST /api/admin/test-calculate
Runs temporary calculation using uploaded file.

### POST /api/admin/test-download
Runs temporary calculation and returns a workbook download.

### POST /api/admin/save
Persists uploaded file and config into source destination.

## Build and Validation Commands

### Frontend build

```bash
cd "E:/mpl-rater/cogitate rater/web-next"
npm run build
```

### Backend syntax check

```bash
cd E:/mpl-rater
python -m py_compile "cogitate rater/backend/main.py" "cogitate rater/backend/config.py" "cogitate rater/backend/registry.py"
```

## Extension Points for New Features

1. Add new backend endpoints in cogitate rater/backend/main.py.
2. Keep reusable file/path logic in cogitate rater/backend/config.py and cogitate rater/backend/registry.py.
3. Add new frontend pages under cogitate rater/web-next/src/app.
4. Add reusable UI/business components under cogitate rater/web-next/src/components.
5. Add API wrappers in cogitate rater/web-next/src/lib/api-client.ts.
6. Update shared types in cogitate rater/web-next/src/types/rater.ts.
7. Preserve source-aware save behavior for any future admin workflows.

## Recommended Development Workflow

1. Define new feature contract first (request/response + source impact).
2. Add backend endpoint + validations.
3. Add frontend service call + UI state handling.
4. Run build/syntax checks.
5. Update this document when folder contracts or APIs change.

## Known Operational Notes

1. Startup scripts are foreground by design; use Ctrl+C to stop.
2. If backend appears offline in admin, verify /api/health and .env.local API base URL.
3. If save fails with conflict, slug already exists in selected source.

## Migration Status

- Core migration to apps layout: complete.
- Source-aware admin save: complete.
- Missing admin save fields: complete.
- Baseline docs for future feature development: complete.
