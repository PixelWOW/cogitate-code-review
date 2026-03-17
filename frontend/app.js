// frontend/app.js
// Dynamic form renderer — works with any config.json, zero hardcoded fields

const API = window.location.origin;

// ─── Render a dynamic form from config ───────────────────────────────
function renderForm(container, config) {
  container.innerHTML = "";

  // Group inputs by group name
  const groups = {};
  for (const inp of config.inputs) {
    const g = inp.group || "General";
    if (!groups[g]) groups[g] = [];
    groups[g].push(inp);
  }

  // Render each group as a panel section
  for (const [groupName, fields] of Object.entries(groups)) {
    const section = document.createElement("div");
    section.className = "form-group-section";

    const header = document.createElement("div");
    header.className = "section-divider";
    header.innerHTML = `<h3>${groupName}</h3>`;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "form-grid";

    for (const field of fields) {
      const label = document.createElement("label");
      label.textContent = field.label || field.field;

      let widget;
      if (field.type === "dropdown" && field.options) {
        widget = document.createElement("select");
        for (const opt of field.options) {
          const o = document.createElement("option");
          o.value = opt;
          o.textContent = opt;
          if (field.default !== undefined && String(opt) === String(field.default)) {
            o.selected = true;
          }
          widget.appendChild(o);
        }
      } else if (field.type === "number") {
        widget = document.createElement("input");
        widget.type = "number";
        widget.step = "any";
        if (field.default !== undefined) widget.value = field.default;
      } else {
        widget = document.createElement("input");
        widget.type = "text";
        if (field.default !== undefined) widget.value = field.default;
      }

      widget.id = `field-${field.field}`;
      widget.dataset.field = field.field;
      widget.dataset.type = field.type || "text";
      label.appendChild(widget);
      grid.appendChild(label);
    }

    section.appendChild(grid);
    container.appendChild(section);
  }
}

// ─── Render output panel from config ─────────────────────────────────
function renderOutputPanel(container, config) {
  container.innerHTML = "";

  // Find primary output
  const primary = config.outputs.find(o => o.primary) || config.outputs[0];
  const secondary = config.outputs.filter(o => o !== primary);

  // Primary display
  const display = document.createElement("div");
  display.id = "premium-display";
  display.innerHTML = `
    <div class="premium-tag">${primary.label.toUpperCase()}</div>
    <span id="primary-output">—</span>
  `;
  container.appendChild(display);

  // Breakdown table
  if (secondary.length > 0) {
    const table = document.createElement("table");
    table.id = "breakdown-table";
    table.innerHTML = `
      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        ${secondary.map(o => `
          <tr>
            <td>${o.label}</td>
            <td id="out-${o.field}">—</td>
          </tr>
        `).join("")}
      </tbody>
    `;
    container.appendChild(table);
  }
}

// ─── Collect all input values from the dynamic form ──────────────────
function collectInputs(config) {
  const data = {};
  for (const inp of config.inputs) {
    const el = document.getElementById(`field-${inp.field}`);
    if (!el) continue;
    let val = el.value;
    if (inp.type === "number") {
      val = val === "" ? null : Number(val);
    }
    data[inp.field] = val;
  }
  return data;
}

// ─── Display calculation outputs ─────────────────────────────────────
function displayOutputs(config, outputs) {
  const primary = config.outputs.find(o => o.primary) || config.outputs[0];
  const primaryEl = document.getElementById("primary-output");

  if (primaryEl) {
    const val = outputs[primary.field];
    if (val !== null && val !== undefined && typeof val === "number") {
      primaryEl.textContent = "$" + val.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      primaryEl.textContent = val ?? "—";
    }
  }

  // Secondary outputs
  for (const out of config.outputs) {
    if (out === primary) continue;
    const el = document.getElementById(`out-${out.field}`);
    if (!el) continue;
    const val = outputs[out.field];
    if (val !== null && val !== undefined) {
      el.textContent = typeof val === "number"
        ? parseFloat(val.toFixed(4))
        : val;
    } else {
      el.textContent = "—";
    }
  }
}

// ─── Clear outputs ───────────────────────────────────────────────────
function clearOutputs(config) {
  const primaryEl = document.getElementById("primary-output");
  if (primaryEl) primaryEl.textContent = "—";
  for (const out of config.outputs) {
    const el = document.getElementById(`out-${out.field}`);
    if (el) el.textContent = "—";
  }
}
