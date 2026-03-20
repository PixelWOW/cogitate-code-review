# MPL Rater — Architecture

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend API | **FastAPI** (Python) | REST endpoints, file handling, request routing |
| Excel Read/Write | **openpyxl** | Write inputs to cells, read outputs after recalculation |
| Formula Engine | **LibreOffice Headless** | Recalculate Excel formulas server-side (subprocess) |
| Data Validation | **Pydantic** | Request/response model validation |
| Frontend | **Vanilla HTML + CSS + JS** | Dynamic form rendering, no framework |
| Deployment | **Docker + Linux** | Production container with LibreOffice pre-installed |
| Local Dev | **Windows + LibreOffice** | Same code, different binary path |

No database. All state is file-based (`raters/` and `templates/` folders).

---

## Project Structure

```
mpl-rater/
│
├── backend/
│   ├── main.py                ← FastAPI app, routes, static mount
│   ├── engine.py              ← Generic calculation engine (copy → write → recalc → read)
│   ├── registry.py            ← Discovers raters from raters/ and templates/ folders
│   ├── config.py              ← Global config (LibreOffice path, work dir)
│   ├── models.py              ← Pydantic models (generic, config-driven)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html             ← Landing page: rater selector + dynamic form
│   ├── admin.html             ← Option 1: Upload Excel + config builder
│   ├── tester.html            ← Option 2: Test from templates/ folder
│   ├── app.js                 ← Dynamic form renderer + calculate logic
│   ├── admin.js               ← Config builder logic
│   └── styles.css             ← Shared dark theme
│
├── raters/                    ← LIVE raters (created via Option 1)
│   └── <slug>/
│       ├── template.xlsx      ← Master Excel (never modified at runtime)
│       ├── config.json        ← Input/output cell mappings + UI definition
│       └── meta.json          ← Display name, description, created date
│
├── templates/                 ← TESTING raters (manually placed files)
│   └── <name>/
│       ├── template.xlsx      ← Excel file (manually pasted)
│       └── config.json        ← Config file (manually pasted)
│
├── tests/
│   ├── test_api.py
│   └── golden_cases.json
│
├── ARCHITECTURE.md            ← This file
└── README.md
```

---

## Two Operational Modes

### Option 1 — Admin: Config Builder

**Purpose:** Onboard a new Excel rater from scratch.

```
┌──────────────────────────────────────────────────────────────┐
│  ADMIN UI (admin.html)                                       │
│                                                              │
│  1. Upload Excel file from local machine                     │
│  2. System scans:                                            │
│     - Sheet names                                            │
│     - Data validations (dropdowns + their options)           │
│     - Unlocked cells (candidate inputs)                      │
│     - Formula cells (candidate outputs)                      │
│     - Cell labels (adjacent text)                            │
│  3. Admin reviews/edits mappings:                            │
│     - Tag cells as input / output / ignore                   │
│     - Set field labels, types, groups                        │
│     - Set which output is the "primary" result               │
│  4. Enter rater name + slug                                  │
│  5. Save                                                     │
│     → template.xlsx copied to raters/<slug>/                 │
│     → config.json saved to raters/<slug>/                    │
│     → meta.json saved to raters/<slug>/                      │
└──────────────────────────────────────────────────────────────┘
```

### Option 2 — Tester: Verify Config

**Purpose:** Test a rater config before going live. Uses manually placed files.

```
┌──────────────────────────────────────────────────────────────┐
│  TESTER UI (tester.html)                                     │
│                                                              │
│  1. Dropdown lists all subfolders in templates/              │
│  2. Select a rater → loads its config.json                   │
│  3. Dynamic form renders from config                         │
│  4. Fill inputs → Calculate                                  │
│     → Engine uses templates/<name>/template.xlsx             │
│     → Writes inputs per config.json                          │
│     → LibreOffice recalculates                               │
│     → Reads outputs per config.json                          │
│  5. Outputs displayed → verify correctness                   │
│                                                              │
│  Nothing is saved. Pure testing.                             │
└──────────────────────────────────────────────────────────────┘
```

---

## Calculation Pipeline (Same for Both Modes)

```
Request (inputs + rater_id)
│
├─ 1. Lookup: load config.json for the rater
│     → knows which sheet, which cells, which types
│
├─ 2. Isolate: copy template.xlsx → /tmp/<uuid>.xlsx
│     → master template is NEVER modified
│
├─ 3. Write: openpyxl writes each input to its mapped cell
│     → e.g. config says "revenue" → B16, so ws["B16"] = value
│
├─ 4. Recalculate: LibreOffice --headless --calc --convert-to xlsx
│     → forces all formulas to recompute
│     → timeout: 60s
│
├─ 5. Read: openpyxl opens output file with data_only=True
│     → reads each output cell from config
│     → e.g. config says "premium" → B40, so result["premium"] = ws["B40"].value
│
├─ 6. Cleanup: delete temp files (always, in finally block)
│
└─ 7. Return: JSON response with all output values
```

### Concurrency Model

```
User A ──→ /tmp/uuid-aaa.xlsx ──→ LibreOffice process A ──→ result
User B ──→ /tmp/uuid-bbb.xlsx ──→ LibreOffice process B ──→ result
User C ──→ /tmp/uuid-ccc.xlsx ──→ LibreOffice process C ──→ result
```

Each request gets its own temp file + LibreOffice process. Zero shared state.

---

## config.json Format (Dual-Mode / Hybrid Engine)

To support both simple forms and complex repeating tables (e.g., location schedules), the system uses a **Hybrid Configuration Model** (`mode: "flat"` vs `mode: "schedule"`).

### 1. Flat Mode (Standard)
The default mode. Every input corresponds to exactly one static cell.

```json
{
  "mode": "flat",
  "sheet": "Rater",
  "writeRules": { "clearUnusedRows": false },
  "inputs": [
    {
      "field": "insured_name",
      "cell": "B1",
      "type": "text",
      "label": "Insured Name",
      "group": "Client Info"
    }
  ],
  "outputs": [...]
}
```

### 2. Schedule Mode (Dynamic Table Grouping)
Used for complex raters like "Oakbridge" where users need to add repeating sets of properties (e.g., Coverages A-F across 5 different locations). The backend zeros out unneeded leftover rows in the Excel template to prevent "ghost" data from calculating.

```json
{
  "mode": "schedule",
  "sheet": "Rating",
  "writeRules": { "clearUnusedRows": true },
  "schedules": [
    {
      "name": "Coverage A",
      "group": "Coverage Data",
      "rowStart": 9,
      "rowEnd": 14,
      "columns": [
        { "col": "D", "field": "label", "type": "text" },
        { "col": "E", "field": "amount", "type": "number", "options": [] }
      ]
    }
  ],
  "inputs": [ /* Global inputs that don't repeat */ ],
  "outputs": [ /* Outcomes */ ]
}
```

### Field Types

| Type | UI Widget | Written to Excel as |
|---|---|---|
| `text` | Text input | String |
| `number` | Number input | Float/Int |
| `dropdown` | Select dropdown | String (must match VLOOKUP pick list) |

---

## API Endpoints (New Generic Design)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/raters` | List all live raters from `raters/` folder |
| `GET` | `/api/raters/{slug}/config` | Get config.json for a specific rater |
| `POST` | `/api/raters/{slug}/calculate` | Calculate: write inputs, recalc, return outputs |
| `GET` | `/api/templates` | List all test raters from `templates/` folder |
| `GET` | `/api/templates/{name}/config` | Get config.json for a test rater |
| `POST` | `/api/templates/{name}/calculate` | Calculate using a test rater |
| `POST` | `/api/admin/upload` | Upload new Excel → return scan results |
| `POST` | `/api/admin/save` | Save config + Excel → creates `raters/{slug}/` |
| `GET` | `/health` | Status check |

---

## _Schema Sheet Convention (Optional)

Each Excel can optionally include a `_Schema` sheet that self-describes its inputs/outputs.
This sheet is used by the config builder as a **hint** — it pre-fills the mapping UI.

Format (row per field):

| Column A | Column B | Column C | Column D | Column E | Column F | Column G |
|---|---|---|---|---|---|---|
| field | cell | type | label | direction | group | options |
| insured_name | B1 | text | Insured Name | input | Client Info | |
| revenue | B16 | dropdown | Annual Revenue | input | Rating Inputs | $0-$250,000; $250,001-$500,000; ... |
| premium | B40 | number | Total Premium | output | Results | |

When the admin uploads an Excel that has a `_Schema` sheet, the config builder
auto-populates from it — saving significant manual mapping time.
