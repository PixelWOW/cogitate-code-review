# Cogitate Excel Rater: 10-15 Minute Panel Presentation Script

## 1) How to use this script
- Read the "Talk Track" lines exactly if you want a polished delivery.
- Keep the pace: 10-12 minutes talk + 3-5 minutes Q&A.
- If interrupted, jump to the closest section header and continue.

---

## 2) Executive opener (0:00 - 1:00)

### Talk Track
"Today I will walk you through Cogitate Excel Rater, a config-driven rating platform that converts Excel rating models into a controlled web workflow without rewriting formulas manually.

The core value is simple: we keep Excel as the source of truth, expose it through a reliable API and UI, and onboard new raters through schema and config instead of hardcoded backend changes.

This gives us faster onboarding, lower model risk, and better auditability."

### Slide points
- Problem: formula rewrites are risky and slow.
- Solution: schema + config driven runtime.
- Outcome: speed, accuracy, governance.

---

## 3) Problem and why this matters (1:00 - 2:00)

### Talk Track
"In traditional implementations, teams re-implement Excel formulas in code. That creates parity risk, maintenance overhead, and long onboarding cycles each time a rater changes.

Our approach avoids this by executing the original Excel logic in a controlled service flow. That means we preserve model behavior while still delivering a modern UI and API experience."

### Slide points
- No formula rewrite layer.
- Lower drift between actuarial model and API output.
- Faster go-live for new raters.

---

## 4) End-to-end architecture walkthrough (2:00 - 4:00)

### Talk Track
"Here is the end-to-end flow:

1. User selects a rater and fills inputs in the UI.
2. Backend loads the corresponding config.
3. Engine copies template.xlsx to an isolated temp file.
4. Inputs are written to mapped cells.
5. LibreOffice headless recalculates formulas.
6. Output cells are read and returned as JSON.
7. Temp artifacts are cleaned up.

Every request runs in isolated files, so concurrent users do not interfere with each other."

### Slide points
- Frontend: dynamic forms from config.
- Backend: FastAPI orchestration.
- Engine: openpyxl writes/reads + LibreOffice recalc.
- Storage: filesystem raters/templates, no DB required.

---

## 5) Explain the _Schema clearly (4:00 - 6:00)

### Talk Track
"The _Schema sheet is the contract between Excel and the platform.

Each row represents one field mapping. During upload, the parser reads _Schema and produces config metadata. That metadata drives both UI rendering and runtime write/read behavior.

So _Schema is what eliminates hardcoded field logic."

### Explain each column
- `field` (or slug): unique key for API/UI.
- `cell`: target Excel cell, optional sheet-qualified reference.
- `type`: text, number, dropdown.
- `label`: human-readable UI label.
- `direction` / `io`: input or output.
- `group`: UI section grouping.
- `options`: semicolon-separated dropdown values.
- `default`: initial value for form rendering.

### One-line summary for leadership
"_Schema lets us onboard new raters by configuration, not by backend rewrites."

---

## 6) Explain config.json in business and technical terms (6:00 - 8:00)

### Talk Track
"After parsing, we operate on config.json as runtime schema.

config.json tells the UI what to render and tells the engine what to write and what to read. Because both layers depend on the same config contract, consistency improves and change effort drops."

### What to show in config
- `sheet`: default workbook sheet.
- `inputs[]`: field-to-cell mappings for writes.
- `outputs[]`: field-to-cell mappings for reads.
- `mode`: flat or schedule.
- `schedules[]`: repeating row blocks for complex raters.
- `writeRules`: behavior for unused rows (for example clearUnusedRows).

### Positioning line
"This is config-first architecture: same contract controls frontend and backend behavior."

---

## 7) Live demo sequence (8:00 - 11:30)

### Demo flow
1. Open landing page and identify Admin vs Tester.
2. Go to Tester.
3. Select source and rater.
4. Click Load Config.
5. Point to grouped dynamic form sections.
6. Update a few inputs.
7. Click Calculate and show outputs.
8. Click Download Calculated Excel to show audit traceability.
9. Switch to Admin.
10. Upload a schema-enabled workbook.
11. Show parsed input/output preview.
12. Run Test Calculate.
13. Save as a live rater.

### Talk Track while demoing
"Notice that no hardcoded screen was built for this specific rater. The UI is generated from config, and engine mapping comes from the same source."

---

## 8) Performance positioning (11:30 - 12:30)

### Talk Track
"Current response time on heavy models is usually a few seconds because we are executing real workbook recalculation for parity.

This is expected for complex actuarial dependency graphs. Accuracy is currently prioritized.

Our next optimization path is persistent calculation workers and reuse strategies to reduce startup overhead and move toward sub-second targets for lighter models."

### Keep this concise
- Today: parity-first architecture.
- Next: persistent worker + pooling + profiling.

---

## 9) Closing statement (12:30 - 13:00)

### Talk Track
"To summarize: Cogitate Excel Rater transforms spreadsheet models into a governed API product with minimal reimplementation risk.

It is schema-driven, config-first, and built to scale onboarding across multiple raters while preserving model fidelity."

---

## 10) Likely manager/director questions and strong answers (Q&A)

## Q1. Why did you not rewrite formulas directly in Python?
**Answer:**
"We intentionally avoided rewrite risk. Keeping Excel as source of truth minimizes parity drift and cuts validation cycles. That is the safer path for actuarial logic where exact behavior matters."

## Q2. Is this scalable if we onboard many raters?
**Answer:**
"Yes, the architecture is onboarding-oriented. New raters are added via schema/config, not backend code. Operationally, scaling focuses on worker concurrency and process optimization, not per-rater custom code branches."

## Q3. How do we ensure governance and auditability?
**Answer:**
"Mappings are explicit in schema/config, runtime behavior is deterministic per request, and downloaded calculated workbooks provide an auditable artifact of input-to-output execution."

## Q4. What are the current risks?
**Answer:**
"Main risks are schema quality, mapping validation, and calc latency on heavy workbooks. Mitigations are stricter pre-save validation, golden test cases, and persistent calc worker optimization."

## Q5. Why is latency not always under one second?
**Answer:**
"Because we recalculate full workbook logic for parity. Complex files have deep dependency trees. Sub-second is a performance engineering milestone, not a correctness compromise."

## Q6. What is your immediate roadmap after this demo?
**Answer:**
"Three priorities: performance optimization, stronger schema validation guardrails, and regression test packs per rater."

## Q7. What happens if business changes a field in Excel?
**Answer:**
"Update the schema/config mapping, validate, and redeploy that rater package. We do not need to rewrite core engine logic for each field change."

## Q8. How does this compare with competitors or alternate internal approaches?
**Answer:**
"Our differentiator is controlled Excel parity with config-first onboarding. Many alternatives either hardcode forms or rewrite formulas, which increases long-term change cost and drift risk."

## Q9. Is there vendor lock-in with this approach?
**Answer:**
"The contract is open and file-based. Schema/config/workbook artifacts are portable. The orchestration layer can be hosted flexibly because it is standard API + file execution flow."

## Q10. What one KPI should leadership track?
**Answer:**
"Track onboarding lead time per new rater and parity defect rate. If both trend down, the platform is delivering exactly what it was designed for."

---

## 11) 60-second backup pitch (if time is cut)

"Cogitate Excel Rater converts Excel models into a controlled API and UI without formula rewrites. We use _Schema as a contract, generate config-driven forms, execute real workbook recalculation, and return mapped outputs.

This reduces parity risk, accelerates onboarding, and improves governance. Next phase is latency optimization using persistent calc workers and profiling."

---

## 12) Delivery tips so you sound senior in the room
- Use "parity", "governance", "onboarding velocity", and "operational guardrails".
- Do not oversell sub-second latency today; anchor on accuracy first.
- When asked hard questions, answer in this order: current state -> risk -> mitigation -> timeline.
- Keep your hands on the demo flow; avoid jumping tabs randomly.

Good luck. This narrative positions your approach as deliberate, safer, and production-minded.
