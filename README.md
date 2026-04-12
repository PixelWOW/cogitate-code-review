# Cogitate Rater Engine

A blazing fast, next-generation hybrid pricing engine that dynamically converts locally-built pricing/rating Microsoft Excel files into live, highly-concurrent web applications instantly.

## ?? Overview
The Cogitate Rater Engine leverages a powerful **FastAPI + Microsoft Excel native COM (win32com) backend** combined with a **Next.js (React) + TailwindCSS frontend**.

Unlike traditional tools that either require manual hardcoding of Excel logic into web languages, or use slow library-based parsers, this platform:
1. reads a standardized _Schema tab from your uploaded Excel sheet to dynamically construct the frontend inputs/outputs form.
2. Maintains a "Warm" Background Pool (TemplateWorkerPool) of native invisible Microsoft Excel COM processes in system RAM.
3. Automatically maps incoming JSON payload data into the Excel file, strictly computes via Excel's native engine, and pulls the evaluated results outward all with virtually zero latency.

## ? Features
- **Admin Engine Workspace:** Upload raw .xlsx files, view the parsed inputs/outputs rendered via JSON mapping, test calculation values, and officially approve/save it to the rater repository.
- **Client Execution Panel:** Allows end-users (or integration systems) to choose a locked system template or an admin-approved custom rater to instantly compute premiums.
- **Historical Immutable Records:** Every test, execution, and calculation is permanently fingerprinted and stored in a local /records immutable database for audit tracking.
- **High Concurrency:** Background processes hold calculation files open in RAM (preventing disk I/O bottlenecks or slow boot-up times).

---

## ??? Architecture

`	ext
/cogitate rater
+-- /backend/               # Python (FastAPI) Backend
¦   +-- main.py             # Core API routing, execution & save logging hooks
¦   +-- engine.py           # Bridging logic between web payloads and Excel
¦   +-- warm_sessions.py    # Manages backend concurrent Excel.Application Thread Pools
¦   +-- excel_worker.py     # COM automation logic manipulating specific cells
¦   +-- requirements.txt    # Python Dependencies
¦
+-- /web-next/              # React (Next.js) Frontend
¦   +-- src/app/admin/      # Admin creation and testing workflows
¦   +-- src/app/client/     # Standard user interaction and calculation execution
¦   +-- src/components/     # Dynamic form renderers and Output Panels
¦
+-- /templates/             # Locked, official base pricing templates
+-- /raters/                # Saved, approved custom raters spawned from the Admin panel
+-- /records/               # Immutable database mapping histories of executions
+-- start-all.bat           # Deployment script
`

---

## ?? Pre-requisites

Because this application daemonizes native Microsoft technologies via COM APIs, **the backend must be run on a Windows machine with Microsoft Excel installed locally**.

*   **Operating System**: Windows 10/11 or Windows Server.
*   **Microsoft Excel**: A locally licensed version of Microsoft Office/Excel must be installed.
*   **Python Target**: Python 3.9 ~ 3.11.
*   **Node.js**: Node v18+ (for Next.js frontend).

---

## ??? Installation & Setup

### 1. Dependency Setup (Python & Node)

If you are setting this up for the first time, you must install the dependencies for both environments.

**Backend (Python)**:
`powershell
pip install -r requirements.txt
`

**Frontend (Node/Next.js)**:
`powershell
cd "cogitate rater/web-next"
npm install
npm run build
`

### 2. Running The Application

You can start both servers concurrently using the provided batch file in the root directory:
`powershell
./start-all.bat
`

Alternatively, run them manually in separate terminal windows:
*   **Backend Server:** cd "cogitate rater/backend" -> uvicorn main:app --reload (Runs on http://127.0.0.1:8000)
*   **Frontend Server:** cd "cogitate rater/web-next" -> 
pm run dev (Runs on http://localhost:3000)

## ?? Usage Workflow

1. Navigate to **http://localhost:3000** in your browser.
2. **Launch the Admin UI**: Upload your local Excel rater file (Must contain a tab named _Schema formatted correctly).
3. The platform will automatically parse the schema and dynamically construct a test-rig web UI.
4. Input test parameters into the generated form and click **Test Calculate**.
5. Once vetted, assign it a Name and click **Save Rater**.
6. Switch over to the **Client UI**. Choose your newly saved Rater (or a System Template) from the dropdown. Notice how the calculation occurs almost instantly due to the pre-warming RAM features actively handling your request in the background!
