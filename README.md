# 🚀 Cogitate Rater Engine

A blazing fast, next-generation hybrid pricing engine that dynamically converts locally-built pricing/rating Microsoft Excel files into live, highly-concurrent web applications instantly.

## 📊 Architecture & Data Flow

`mermaid
graph TD
    subgraph Frontend
        A[Next.js Web UI]
    end
    subgraph FastAPI Backend
        B[API Router / main.py]
        C[Engine & Schema Parser]
        D[Warm Sessions Pool]
    end
    subgraph Local System
        E[(Microsoft Excel win32com)]
        F[Immutable /records/ DB]
    end

    A -->|1. Uploads Excel Schema| B
    B -->|2. Parses _Schema Tab| C
    C -->|3. Returns JSON UI Form| A
    
    A -->|4. Triggers Calculation| B
    B -->|5. Grabs Warm Instance| D
    D -->|6. Injects JSON Data| E
    E -->|7. Calculates Rates| E
    E -->|8. Returns Output| B
    B -->|9. Saves Audit Snapshot| F
    B -->|10. Returns Premium| A
`

## ⚙️ Core Workflows Explained

### 1. The Admin Workflow (Dynamic UI Generation)
Raw Excel logic is converted into a web app here.
- **Upload:** An admin uploads a standard .xlsx pricing file containing a _Schema tab.
- **Parsing:** FastAPI reads the _Schema tab to map input variables, data types, and output cells.
- **Dynamic UI:** The schema is sent to Next.js as JSON, which instantly generates a dynamic HTML form (dropdowns, inputs). **Zero hardcoding required.**
- **Saving:** The admin tests and saves the rater, officially registering it in the 
aters/ directory for clients.

### 2. The Pre-Warming Workflow (RAM Management)
This creates the "blazing fast" zero-latency experience.
- **Background Trigger:** When a client selects a template, the frontend silently pings the backend /config endpoint.
- **COM Threads:** FastAPI uses a BackgroundTask to instruct warm_sessions.py to open Microsoft Excel invisibly via Windows COM (win32com) and load the .xlsx into system RAM.
- **Standby:** The file is held open, avoiding slow disk I/O when it's time to actually calculate.

### 3. The Client Execution Workflow (Calculation & Audit)
How the end-user gets their premium.
- **Execution:** User fills out the web form. A JSON payload is sent to the backend.
- **Injection:** excel_worker.py grabs the pre-warmed Excel instance from RAM, injects the JSON values directly into the target cells, and tells Excel to calculate.
- **Audit Log:** *Before* returning the data, _save_execution_record() creates a permanent fingerprint of the exact inputs, outputs, and Excel file used, saving it to /records/.
- **Response:** The calculated premium is returned to the user in milliseconds.

## 📁 Folder Structure

`	ext
cogitate-rater-engine/
├── cogitate rater/
│   ├── backend/               # FastAPI & win32com engine
│   │   ├── engine.py          # Bridging logic mapping web payloads to Excel
│   │   ├── excel_worker.py    # Native COM automation interacting with cells
│   │   ├── main.py            # API routes and database hooks
│   │   ├── warm_sessions.py   # Session & RAM thread pool management
│   │   └── requirements.txt   # Python Dependencies
│   ├── raters/                # Saved, approved custom raters spawned from Admin
│   ├── templates/             # Locked, official base pricing templates
│   └── web-next/              # React (Next.js) Frontend
│       ├── src/app/admin/     # Admin upload and testing workflows
│       ├── src/app/client/    # Client execution & calculation panel
│       └── src/components/    # Dynamic React form renderers
└── README.md                  # This documentation
`

## 🛑 Prerequisites

Because this app daemonizes native Microsoft technologies via COM APIs, **the backend MUST be run on a Windows machine with Microsoft Excel installed locally.**

*   **OS:** Windows 10/11 or Windows Server.
*   **Software:** Microsoft Office/Excel installed locally.
*   **Backend:** Python 3.9+
*   **Frontend:** Node.js v18+

## 🛠️ Step-by-Step Installation

### 1. Clone the Repository
`ash
git clone https://github.com/tanmay5110/cogitate-code-review.git
cd cogitate-code-review
`

### 2. Setup the Backend (Python)
`powershell
cd "cogitate rater/backend"

# Create and activate a virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI Server
uvicorn main:app --reload
`
*The backend is now running on http://127.0.0.1:8000*

### 3. Setup the Frontend (Next.js)
Open a **new** terminal window:
`powershell
cd "cogitate rater/web-next"

# Install Node dependencies
npm install

# Start the Next.js development server
npm run dev
`
*The frontend is now running on http://localhost:3000*

## 🔌 API Payload Example (Integration)

If you are hitting the API programmatically (without the frontend UI), your JSON payload will look like this:

`json
POST /api/rater/calculate
{
    "rater_id": "homeowners_v1",
    "inputs": {
        "Coverage_A": 500000,
        "Deductible": 1000,
        "Construction_Type": "Frame",
        "Year_Built": 2020
    }
}
`
