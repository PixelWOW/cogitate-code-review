# IMPLEMENTATION v1 — Generic Excel Rater System

## Overview

Transform the hardcoded MPL-only rater into a generic system that works
with **any** Excel rater file driven by `config.json`.

**v1 approach:** No LLM. Every Excel must have a `_Schema` sheet that
declares its inputs/outputs. The system reads that sheet to generate
`config.json` automatically.

---

## Folder Structure (Target)

```
mpl-rater/
├── backend/
│   ├── main.py              ← rewrite: generic API routes
│   ├── engine.py             ← rewrite: generic calc engine (no hardcoded cells)
│   ├── registry.py           ← NEW: discover raters from raters/ and templates/
│   ├── schema_parser.py      ← NEW: parse _Schema sheet → config.json
│   ├── config.py             ← slim down: only LibreOffice path + global settings
│   └── requirements.txt      ← unchanged
│
├── frontend/
│   ├── index.html            ← rewrite: landing page with mode selector
│   ├── tester.html           ← NEW: Option 2 — test raters from templates/
│   ├── admin.html            ← NEW: Option 1 — upload + config builder
│   ├── app.js                ← rewrite: dynamic form renderer
│   ├── admin.js              ← NEW: upload + schema preview logic
│   └── styles.css            ← keep, extend as needed
│
├── raters/                    ← live raters (output of Option 1)
│   └── mpl/
│       ├── template.xlsx
│       ├── config.json
│       └── meta.json
│
├── templates/                 ← test raters (manually placed)
│   └── mpl/
│       ├── template.xlsx
│       └── config.json
│
├── dump/                      ← temp scripts, test outputs, throwaway files
│
├── ARCHITECTURE.md
├── IMPLEMENTATION.md          ← this file
└── README.md
```

---

## What Gets Deleted / Replaced

| File | Action | Reason |
|---|---|---|
| `backend/config.py` | **Gut it** | Remove INPUT_CELLS, OUTPUT_CELLS, DROPDOWN_OPTIONS, SHEET_NAME, TEMPLATE_PATH. Keep only LIBREOFFICE_BIN and base paths. |
| `backend/models.py` | **Delete** | RaterInput was hardcoded to 24 MPL fields. New system uses raw dicts driven by config.json. Pydantic validation not needed — config.json defines the schema. |
| `backend/excel_engine.py` | **Replace with engine.py** | Remove imports of hardcoded config. Accept (template_path, sheet, input_cells, output_cells, input_data) as args. |
| `backend/main.py` | **Rewrite** | Remove MPL-specific routes. New generic routes: list raters, get config, calculate for any rater. |
| `frontend/index.html` | **Rewrite** | Remove hardcoded MPL form. New landing page with mode links. |
| `frontend/app.js` | **Rewrite** | Remove hardcoded field names and payload building. New dynamic form renderer that reads config.json. |

---

## Phases

---

### Phase 1 — Backend Foundation

Strip all hardcoded references. Build the generic engine.

#### Step 1.1 — Slim down config.py

Keep ONLY:
```python
LIBREOFFICE_BIN = ...    # auto-detected by OS
RATERS_DIR = Path("raters")
TEMPLATES_DIR = Path("templates")
```

Delete: INPUT_CELLS, OUTPUT_CELLS, DROPDOWN_OPTIONS, SHEET_NAME,
TEMPLATE_PATH, HAZARD_FIELDS, WORK_DIR.

#### Step 1.2 — Create registry.py

Scans folders and returns available raters:
```python
def list_raters() -> list[dict]
    # scan raters/ → return [{slug, name, description}]

def list_templates() -> list[dict]
    # scan templates/ → return [{name}]

def load_config(source: str, name: str) -> dict
    # source = "raters" or "templates"
    # reads and returns parsed config.json

def get_template_path(source: str, name: str) -> Path
    # returns path to template.xlsx
```

#### Step 1.3 — Create engine.py (generic)

Single function, zero hardcoded references:
```python
def calculate(template_path: Path, config: dict, input_data: dict, keep_file=False) -> dict
    # 1. copy template_path → /tmp/<uuid>.xlsx
    # 2. open with openpyxl, write inputs per config["inputs"] cell mappings
    # 3. LibreOffice recalculate
    # 4. read outputs per config["outputs"] cell mappings
    # 5. cleanup
    # Returns: {field: value for each output}
```

Config tells engine everything — sheet name, input cells, output cells.
Engine knows nothing about MPL or any specific rater.

#### Step 1.4 — Create schema_parser.py

Reads the `_Schema` sheet from an uploaded Excel:
```python
def parse_schema(xlsx_path: Path) -> dict
    # 1. open with openpyxl
    # 2. find sheet named "_Schema"
    # 3. read rows: field, cell, type, label, direction, group, options, default
    # 4. split into inputs[] and outputs[]
    # 5. return config dict (same format as config.json)
    # Raises ValueError if _Schema sheet not found
```

#### Step 1.5 — Rewrite main.py

Delete models.py import. New routes:

```
GET  /api/raters                      → list raters from raters/
GET  /api/raters/{slug}/config        → return config.json
POST /api/raters/{slug}/calculate     → generic calculate

GET  /api/templates                   → list templates from templates/
GET  /api/templates/{name}/config     → return config.json
POST /api/templates/{name}/calculate  → generic calculate (testing)

POST /api/admin/upload                → receive Excel, parse _Schema, return preview
POST /api/admin/save                  → save config + Excel → raters/<slug>/

GET  /health                          → status check
```

All calculate routes follow the same pattern:
1. Load config from the right folder
2. Call engine.calculate(template_path, config, input_data)
3. Return results as JSON dict — no hardcoded response model

#### Step 1.6 — Delete models.py

No longer needed. Inputs and outputs are dynamic dicts
shaped by config.json, not fixed Pydantic models.

---

### Phase 2 — Option 2: Tester UI

Build the simpler mode first to validate the engine works.

#### Step 2.1 — Create tester.html

Layout:
```
┌─────────────────────────────────────────────────────┐
│  [Rater Selector Dropdown]  (from templates/ folder)│
├──────────────────────┬──────────────────────────────┤
│  Dynamic Input Form  │  Output Panel                │
│  (from config.json)  │  - Primary output (big)      │
│  - grouped by group  │  - Secondary outputs (table)  │
│  - type → widget     │  - Calculate button           │
│                      │  - Download button             │
└──────────────────────┴──────────────────────────────┘
```

#### Step 2.2 — Rewrite app.js (dynamic form renderer)

Core function:
```javascript
function renderForm(config) {
    // 1. group inputs by config.inputs[].group
    // 2. for each group, create a panel
    // 3. for each input in group:
    //    - type "text"     → <input type="text">
    //    - type "number"   → <input type="number">
    //    - type "dropdown" → <select> with config.inputs[].options
    //    - set default from config.inputs[].default
    // 4. render output panel:
    //    - find primary output (primary: true)
    //    - list secondary outputs in breakdown table
}

function collectInputs(config) {
    // read all form values, return {field: value} dict
    // uses config to know which fields exist and their types
}

function calculate(source, name, config) {
    // POST to /api/{source}/{name}/calculate
    // body = collectInputs(config)
    // display results in output panel
}
```

No hardcoded field names. Everything driven by config.

#### Step 2.3 — Wire up tester page

1. On load → GET /api/templates → populate rater dropdown
2. On rater select → GET /api/templates/{name}/config → renderForm()
3. On calculate click → POST /api/templates/{name}/calculate → show results

---

### Phase 3 — Option 1: Admin Config Builder

Upload Excel with `_Schema` sheet → preview → save to raters/.

#### Step 3.1 — Create admin.html

Layout:
```
┌───────────────────────────────────────────────────────────┐
│  Step 1: Upload Excel                                     │
│  [Choose File] [Upload & Parse]                           │
├───────────────────────────────────────────────────────────┤
│  Step 2: Review Parsed Config                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ sheet: "Rater"                                      │  │
│  │ INPUTS (26 found):                                  │  │
│  │  field          cell  type      label       group   │  │
│  │  insured_name   B1    text      Insured..   Client  │  │
│  │  revenue        B16   dropdown  Annual..    Rating  │  │
│  │  ...                                                │  │
│  │ OUTPUTS (6 found):                                  │  │
│  │  premium        B40   number    Total..     Results │  │
│  │  ...                                                │  │
│  └─────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────┤
│  Step 3: Name & Save                                      │
│  Rater Name: [________________]                           │
│  Slug:       [________________]  (auto-generated)         │
│  [Save to Raters]                                         │
│                                                           │
│  Status: "Saved to raters/mpl/ successfully"              │
└───────────────────────────────────────────────────────────┘
```

#### Step 3.2 — Create admin.js

```javascript
async function uploadExcel() {
    // 1. FormData with the .xlsx file
    // 2. POST /api/admin/upload
    // 3. Server parses _Schema → returns config preview
    // 4. Render inputs/outputs tables in Step 2
    // If no _Schema sheet → show clear error message
}

async function saveRater() {
    // 1. Read name + slug from inputs
    // 2. POST /api/admin/save with {slug, name, config}
    // 3. Server copies Excel + writes config.json + meta.json → raters/<slug>/
    // 4. Show success/error
}
```

#### Step 3.3 — Backend upload + save routes

`POST /api/admin/upload`:
1. Receive uploaded .xlsx via multipart form
2. Save to dump/uploads/<uuid>.xlsx (temporary)
3. Call schema_parser.parse_schema(path)
4. Return parsed config as JSON preview
5. If _Schema not found → return 422 with clear message

`POST /api/admin/save`:
1. Receive {slug, name, description, config} + reference to uploaded file
2. Create raters/<slug>/ directory
3. Copy uploaded Excel → raters/<slug>/template.xlsx
4. Write config → raters/<slug>/config.json
5. Write meta → raters/<slug>/meta.json
6. Clean up dump/uploads/ temp file
7. Return success

---

### Phase 4 — Landing Page + Navigation

#### Step 4.1 — Rewrite index.html as landing/hub

Simple page with two cards:
```
┌──────────────────────────────────────┐
│         Excel Rater System           │
├──────────────┬───────────────────────┤
│   Option 1   │      Option 2        │
│   Admin      │      Tester          │
│              │                       │
│   Upload &   │   Test raters from   │
│   configure  │   templates/ folder  │
│   new rater  │                       │
│              │                       │
│  [Open →]    │    [Open →]           │
└──────────────┴───────────────────────┘
```

#### Step 4.2 — Navigation header

Shared across all pages: link back to home, current page indicator.

---

### Phase 5 — Cleanup

#### Step 5.1 — Delete dead files
- `backend/models.py` (replaced by config-driven dicts)
- Old hardcoded frontend files (replaced in Phase 2/3)

#### Step 5.2 — Update README.md
- New setup instructions
- New folder structure
- New API endpoints

#### Step 5.3 — Update ARCHITECTURE.md if needed

#### Step 5.4 — Verify
- Test Option 2 with templates/mpl/ (existing config + template)
- Test Option 1 by uploading the MPL Excel (has _Schema sheet)
- Verify the saved rater in raters/mpl/ works
- Run from clean state to confirm no hardcoded references remain

---

## Implementation Rules

1. **No hardcoded cell references anywhere in backend code** — all come from config.json
2. **No hardcoded field names in frontend** — all come from config.json via API
3. **No file-specific logic** — engine.py works identically for MPL, Homeowners, OAKBRIDGE, anything
4. **dump/ folder** — all temp scripts, test outputs, throwaway files go here
5. **One concern per file** — engine calculates, registry discovers, schema_parser parses, main routes
