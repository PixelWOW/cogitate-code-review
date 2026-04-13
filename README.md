# 🚀 Cogitate Rater Engine

## 📖 What is this Project & What Problem Does it Solve?
In the insurance and financial industries, complex pricing models are traditionally built and maintained in massive Microsoft Excel workbooks. Converting these Excel files into modern web applications typically takes months of manual software development, or relies on slow, error-prone third-party spreadsheet parsing libraries.

**The Cogitate Rater Engine** solves this by acting as a high-speed, dynamic hybrid bridge. It takes a local Excel file, reads a configuration tab, and **instantly generates a fully functional React web application**. Under the hood, it keeps native Microsoft Excel running invisibly in the server's background RAM, injecting web payloads and extracting calculated results in milliseconds.

### The Two Core Panels
1. **Admin Panel (The Builder):** 
   Designed for system administrators. You upload your standard .xlsx pricing file. The system automatically parses your required inputs and outputs, generating a dynamic test UI right in your browser. You can test your premiums and, once verified, officially save the "Rater" to the repository.
   
2. **Client Panel (The Execution):**
   Designed for end-users. The client selects an approved Rater (or system template) from a dropdown. Thanks to our **RAM Pre-warming** technology, the backend quietly boots up the specific Excel COM instance in advance. When the user submits the form, the calculation executes instantly with zero disk I/O latency. Every single transaction is permanently captured and saved in an immutable /records folder for compliance and historical auditing.

---

## 📊 The Excel _Schema Sheet
For the engine to know how to interact with your Excel file and build the frontend website, your .xlsx workbook **must** contain a worksheet named exactly _Schema. 

This sheet acts as the "API Contract" between the local Excel formulas and the Web UI. It defines:
* **Variable Name:** The human-readable label that will appear on the website's form.
* **Cell Reference:** The exact cell (e.g., Sheet1!B2) where the user's input should be injected or the output premium extracted.
* **Component / Data Type:** Whether it is an Input (Dropdown, Number field, Text) or an Output (Premium calculation).

When the Admin uploads the Excel file, our FastAPI backend reads this _Schema tab, turns it into a JSON configuration, and the Next.js frontend uses that JSON to draw the input form dynamically—requiring absolutely zero frontend code changes when Excel logic updates.

---

## 📁 Codebase Folder Structure

`	ext
cogitate-code-review/
├── cogitate rater/
│   ├── backend/               # Python FastAPI & MS Excel COM Engine
│   │   ├── engine.py          # Bridging logic: Maps web JSON payload into Excel cells
│   │   ├── excel_worker.py    # Native Windows 'win32com' automation logic
│   │   ├── main.py            # API routing, Background Tasks, and Execution Logging
│   │   ├── warm_sessions.py   # RAM Management: Keeps Excel instances idling for speed
│   │   └── requirements.txt   # Python dependencies
│   │
│   ├── web-next/              # React (Next.js) Frontend
│   │   ├── src/app/admin/     # Admin Excel upload and dynamic testing UI
│   │   ├── src/app/client/    # End-user execution panel
│   │   └── src/components/    # Reusable dynamic form renderers
│   │
│   ├── raters/                # Saved, approved custom raters from the Admin panel
│   ├── templates/             # Locked, official base pricing fallback templates
│   └── records/               # Immutable database mapping histories of executions
└── README.md                  # This documentation file
`

---

## 🛠️ Detailed Setup & Execution Instructions

Because this system daemonizes native Microsoft Windows technologies to achieve lightning speed, **the backend must be run on a Windows machine with Microsoft Excel installed locally.**

### Prerequisites
* **Operating System:** Windows 10, 11, or Windows Server.
* **Microsoft Excel:** A locally installed, licensed version of MS Office/Excel.
* **Python:** Version 3.9 to 3.11.
* **Node.js:** Version 18 or higher (for the Next.js frontend).

---

### Step 1: Clone the Repository
Open your terminal and clone the repository locally.
`powershell
git clone https://github.com/tanmay5110/cogitate-code-review.git
cd cogitate-code-review
`

### Step 2: Start the FastAPI Backend (Python)
Navigate to the backend directory, set up your Python virtual environment, install the dependencies, and start the engine:

`powershell
cd "cogitate rater/backend"

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
.\.venv\Scripts\activate

# Install the required packages
pip install -r requirements.txt

# Boot up the server
uvicorn main:app --reload
`
*The backend API is now actively running on http://127.0.0.1:8000*

### Step 3: Start the Next.js Frontend (React)
Open a **new, separate terminal** window. Navigate to the frontend directory, install the Node modules, and start the web interface:

`powershell
cd "cogitate rater/web-next"

# Install Node modules
npm install

# Start the development frontend server
npm run dev
`
*The frontend interface is now running on http://localhost:3000* 

> **🎉 You're Done!** Navigate your web browser to http://localhost:3000/admin, upload an Excel file equipped with a _Schema tab, and watch the engine dynamically construct your application.
