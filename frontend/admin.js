// frontend/admin.js
// Admin: upload Excel, parse _Schema, test calculate, approve & save

let uploadId = null;
let parsedConfig = null;

// ─── Upload & parse ──────────────────────────────────────────────────
async function uploadExcel() {
  const fileInput = document.getElementById("file-input");
  const statusEl = document.getElementById("upload-status");
  const btn = document.getElementById("upload-btn");

  if (!fileInput.files.length) {
    statusEl.textContent = "Please select a file first.";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Uploading...";
  statusEl.textContent = "";

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    const res = await fetch(`${API}/api/admin/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    uploadId = data.upload_id;
    parsedConfig = data.config;

    statusEl.textContent = `Parsed "${data.filename}" — ${parsedConfig.inputs.length} inputs, ${parsedConfig.outputs.length} outputs`;
    statusEl.className = "step-status success";

    showReview();
    showTestCalculate();
    showSaveStep();

  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    statusEl.className = "step-status";
    hideSteps();
  } finally {
    btn.disabled = false;
    btn.textContent = "Upload & Parse";
  }
}

// ─── Show review step ────────────────────────────────────────────────
function showReview() {
  document.getElementById("step-review").style.display = "block";

  // Summary
  const summary = document.getElementById("config-summary");
  summary.textContent = `Sheet: "${parsedConfig.sheet}" | ${parsedConfig.inputs.length} inputs | ${parsedConfig.outputs.length} outputs`;

  // Inputs table
  const inputsTbody = document.querySelector("#inputs-table tbody");
  inputsTbody.innerHTML = "";
  for (const inp of parsedConfig.inputs) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inp.field}</td>
      <td><code>${inp.cell}</code></td>
      <td>${inp.type}</td>
      <td>${inp.label}</td>
      <td>${inp.group}</td>
    `;
    inputsTbody.appendChild(tr);
  }

  // Outputs table
  const outputsTbody = document.querySelector("#outputs-table tbody");
  outputsTbody.innerHTML = "";
  for (const out of parsedConfig.outputs) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${out.field}</td>
      <td><code>${out.cell}</code></td>
      <td>${out.label}</td>
      <td>${out.primary ? "Yes" : ""}</td>
    `;
    outputsTbody.appendChild(tr);
  }
}

// ─── Show test calculate step ────────────────────────────────────────
function showTestCalculate() {
  document.getElementById("step-test").style.display = "block";
  renderForm(document.getElementById("test-form-container"), parsedConfig);
  renderOutputPanel(document.getElementById("test-output-container"), parsedConfig);
}

// ─── Test calculate (uses temp uploaded file) ────────────────────────
async function testCalculate() {
  if (!parsedConfig || !uploadId) return;

  const btn = document.getElementById("test-calc-btn");
  const statusEl = document.getElementById("test-status");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Calculating...';
  statusEl.textContent = "";
  statusEl.className = "step-status";

  const inputs = collectInputs(parsedConfig);

  try {
    const res = await fetch(`${API}/api/admin/test-calculate`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        upload_id: uploadId,
        config: parsedConfig,
        inputs: inputs,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    displayOutputs(parsedConfig, data.outputs);
    statusEl.textContent = "Test calculation successful — review outputs above";
    statusEl.className = "step-status success";

  } catch (err) {
    clearOutputs(parsedConfig);
    statusEl.textContent = "Error: " + err.message;
    statusEl.className = "step-status";
  } finally {
    btn.disabled = false;
    btn.textContent = "Test Calculate";
  }
}

// ─── Show save step ──────────────────────────────────────────────────
function showSaveStep() {
  document.getElementById("step-save").style.display = "block";

  // Auto-generate slug from filename
  const fileInput = document.getElementById("file-input");
  if (fileInput.files.length) {
    const fname = fileInput.files[0].name.replace(/\.xlsx?$/i, "");
    const slug = fname.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    document.getElementById("rater-slug").value = slug;
    document.getElementById("rater-name").value = fname;
  }
}

// ─── Save / Approve ──────────────────────────────────────────────────
async function saveRater() {
  if (!parsedConfig || !uploadId) return;

  const slug = document.getElementById("rater-slug").value.trim();
  const name = document.getElementById("rater-name").value.trim();
  const description = document.getElementById("rater-desc").value.trim();
  const statusEl = document.getElementById("save-status");
  const btn = document.getElementById("save-btn");

  if (!slug) {
    statusEl.textContent = "Slug is required";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";
  statusEl.textContent = "";

  try {
    const res = await fetch(`${API}/api/admin/save`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        upload_id: uploadId,
        slug: slug,
        name: name,
        description: description,
        config: parsedConfig,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    statusEl.textContent = data.message;
    statusEl.className = "step-status success";
    btn.textContent = "Saved!";

  } catch (err) {
    statusEl.textContent = "Error: " + err.message;
    statusEl.className = "step-status";
    btn.disabled = false;
    btn.textContent = "Approve & Save to Raters";
  }
}

// ─── Test download (download calculated Excel for verification) ──────
async function testDownload() {
  if (!parsedConfig || !uploadId) return;

  const btn = document.getElementById("test-download-btn");
  const statusEl = document.getElementById("test-status");
  btn.disabled = true;
  btn.textContent = "Downloading...";

  const inputs = collectInputs(parsedConfig);

  try {
    const res = await fetch(`${API}/api/admin/test-download`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        upload_id: uploadId,
        config: parsedConfig,
        inputs: inputs,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "test_calculated.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    statusEl.textContent = "Excel downloaded — open it to verify input values were written correctly";
    statusEl.className = "step-status success";

  } catch (err) {
    statusEl.textContent = "Download error: " + err.message;
    statusEl.className = "step-status";
  } finally {
    btn.disabled = false;
    btn.textContent = "Download Calculated Excel";
  }
}

// ─── Hide steps after upload error ───────────────────────────────────
function hideSteps() {
  document.getElementById("step-review").style.display = "none";
  document.getElementById("step-test").style.display = "none";
  document.getElementById("step-save").style.display = "none";
}
