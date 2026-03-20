// frontend/app.js
// Dynamic form renderer — works with any config.json, zero hardcoded fields

const API = window.location.origin;


function _buildCellMetaMap(config) {
  const map = {};
  for (const inp of config.inputs || []) {
    if (!inp.cell) continue;
    map[inp.cell.toUpperCase()] = inp;
  }
  return map;
}


function _isScheduleMode(config) {
  return config && config.mode === "schedule" && Array.isArray(config.schedules) && config.schedules.length > 0;
}


function _buildScheduleCellSet(config) {
  const cells = new Set();
  if (!_isScheduleMode(config)) return cells;

  for (const sched of config.schedules) {
    const rowStart = Number(sched.rowStart || 1);
    const rowEnd = Number(sched.rowEnd || rowStart);
    const cols = sched.columns || [];
    for (let row = rowStart; row <= rowEnd; row++) {
      for (const colDef of cols) {
        if (!colDef.column) continue;
        cells.add(`${colDef.column}${row}`.toUpperCase());
      }
    }
  }

  return cells;
}


function _getScheduleDefault(cellMeta, sched, row, colDef) {
  const cellRef = `${colDef.column}${row}`.toUpperCase();
  const meta = cellMeta[cellRef] || {};
  if (meta.default !== undefined) return meta.default;
  if (colDef.default !== undefined) return colDef.default;
  return undefined;
}


function _getScheduleOptions(cellMeta, sched, row, colDef) {
  const cellRef = `${colDef.column}${row}`.toUpperCase();
  const meta = cellMeta[cellRef] || {};
  if (Array.isArray(meta.options) && meta.options.length > 0) return meta.options;
  if (Array.isArray(colDef.options) && colDef.options.length > 0) return colDef.options;
  return null;
}


function _getColumnTypeHint(colDef) {
  if (colDef.type === "dropdown") return " (Dropdown)";
  if (colDef.type === "number") return " ($)";
  return "";
}


function _buildRowSpecificLabel(label, rowIndex) {
  if (!label || !label.includes("#")) return label;
  return label.replace("#", String(rowIndex + 1));
}


function _clearScheduleRow(schedKey, rowIndex) {
  const rowEls = document.querySelectorAll(
    `[data-schedule-key="${schedKey}"][data-schedule-index="${rowIndex}"]`
  );
  for (const el of rowEls) {
    el.value = "";
  }
}


function _setScheduleVisibleRows(schedKey, visibleRows, totalRows, minRows) {
  for (let i = 0; i < totalRows; i++) {
    const tr = document.getElementById(`schedule-row-${schedKey}-${i}`);
    if (!tr) continue;
    tr.style.display = i < visibleRows ? "" : "none";
    if (i >= visibleRows) {
      _clearScheduleRow(schedKey, i);
    }
  }

  const addBtn = document.getElementById(`schedule-add-${schedKey}`);
  if (addBtn) addBtn.disabled = visibleRows >= totalRows;

  const resetBtn = document.getElementById(`schedule-reset-${schedKey}`);
  if (resetBtn) resetBtn.disabled = visibleRows <= minRows;
}

// ─── Render a dynamic form from config ───────────────────────────────
function renderForm(container, config) {
  container.innerHTML = "";

  const scheduleMode = _isScheduleMode(config);
  const scheduleCells = _buildScheduleCellSet(config);

  if (scheduleMode) {
    const modeBanner = document.createElement("div");
    modeBanner.className = "config-summary";
    modeBanner.textContent = `Schedule mode enabled: ${config.schedules.length} coverage block(s)`;
    container.appendChild(modeBanner);
  }

  // Group inputs by group name
  const groups = {};
  for (const inp of config.inputs) {
    if (scheduleMode && inp.cell && scheduleCells.has(String(inp.cell).toUpperCase())) {
      continue;
    }
    const g = inp.group || "General";
    if (!groups[g]) groups[g] = [];
    groups[g].push(inp);
  }

  // Render each group as a panel section
  for (const [groupName, fields] of Object.entries(groups)) {
    if (fields.length === 0) continue;
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

  // Optional schedule/repeater sections for complex raters.
  if (scheduleMode) {
    const cellMeta = _buildCellMetaMap(config);

    for (const sched of config.schedules) {
      const section = document.createElement("div");
      section.className = "form-group-section";

      const header = document.createElement("div");
      header.className = "section-divider";
      header.innerHTML = `<h3>${sched.title || sched.key}</h3>`;
      section.appendChild(header);

      const table = document.createElement("table");
      table.className = "config-table";

      const cols = sched.columns || [];
      const theadCells = cols.map(c => {
        const label = c.label || c.field;
        const typeHint = _getColumnTypeHint(c);
        return `<th>${label}${typeHint}</th>`;
      }).join("");
      table.innerHTML = `<thead><tr><th>#</th>${theadCells}</tr></thead>`;

      const tbody = document.createElement("tbody");
      const rowStart = Number(sched.rowStart || 1);
      const rowEnd = Number(sched.rowEnd || rowStart);
      const totalRows = Math.max(0, rowEnd - rowStart + 1);
      const minRows = Math.max(1, Number(sched.minActiveRows || 1));
      let visibleRows = minRows;

      for (let row = rowStart; row <= rowEnd; row++) {
        const rowIndex = row - rowStart;
        const tr = document.createElement("tr");
        tr.id = `schedule-row-${sched.key}-${rowIndex}`;
        const rowNum = document.createElement("td");
        rowNum.textContent = String(rowIndex + 1);
        tr.appendChild(rowNum);

        for (const colDef of cols) {
          const td = document.createElement("td");
          const options = _getScheduleOptions(cellMeta, sched, row, colDef);
          const defaultVal = _getScheduleDefault(cellMeta, sched, row, colDef);

          if (defaultVal !== undefined && defaultVal !== null && String(defaultVal) !== "") {
            visibleRows = Math.max(visibleRows, rowIndex + 1);
          }

          let el;
          if (options && options.length > 0) {
            el = document.createElement("select");
            const blank = document.createElement("option");
            blank.value = "";
            blank.textContent = "";
            el.appendChild(blank);

            for (const opt of options) {
              const o = document.createElement("option");
              o.value = opt;
              o.textContent = opt;
              if (defaultVal !== undefined && String(opt) === String(defaultVal)) {
                o.selected = true;
              }
              el.appendChild(o);
            }
            
            // Add row-specific label for dropdowns
            const rowSpecificLabel = _buildRowSpecificLabel(colDef.label || colDef.field, rowIndex);
            el.title = rowSpecificLabel;
            el.ariaLabel = rowSpecificLabel;
          } else {
            el = document.createElement("input");
            el.type = colDef.type === "number" ? "number" : "text";
            if (colDef.type === "number") el.step = "any";
            if (defaultVal !== undefined) el.value = defaultVal;
            
            // Add row-specific placeholder
            const rowSpecificLabel = _buildRowSpecificLabel(colDef.label || colDef.field, rowIndex);
            el.placeholder = rowSpecificLabel;
          }

          el.id = `schedule-${sched.key}-${rowIndex}-${colDef.field}`;
          el.dataset.scheduleKey = sched.key;
          el.dataset.scheduleIndex = String(rowIndex);
          el.dataset.scheduleField = colDef.field;
          el.dataset.type = colDef.type || "text";
          td.appendChild(el);
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      section.appendChild(table);

      // Dynamic controls for long schedule blocks.
      const controls = document.createElement("div");
      controls.className = "btn-row";

      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.id = `schedule-add-${sched.key}`;
      addBtn.textContent = "Add Row";
      addBtn.onclick = () => {
        visibleRows = Math.min(totalRows, visibleRows + 1);
        _setScheduleVisibleRows(sched.key, visibleRows, totalRows, minRows);
      };

      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.id = `schedule-reset-${sched.key}`;
      resetBtn.className = "download-btn";
      resetBtn.textContent = "Reset Extra Rows";
      resetBtn.onclick = () => {
        visibleRows = minRows;
        _setScheduleVisibleRows(sched.key, visibleRows, totalRows, minRows);
      };

      controls.appendChild(addBtn);
      controls.appendChild(resetBtn);
      section.appendChild(controls);
      container.appendChild(section);

      _setScheduleVisibleRows(sched.key, visibleRows, totalRows, minRows);
    }
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
  const scheduleMode = _isScheduleMode(config);
  const scheduleCells = _buildScheduleCellSet(config);
  const data = {};
  for (const inp of config.inputs) {
    if (scheduleMode && inp.cell && scheduleCells.has(String(inp.cell).toUpperCase())) {
      continue;
    }
    const el = document.getElementById(`field-${inp.field}`);
    if (!el) continue;
    let val = el.value;
    if (inp.type === "number") {
      val = val === "" ? null : Number(val);
    }
    data[inp.field] = val;
  }

  if (scheduleMode) {
    const schedules = {};

    for (const sched of config.schedules) {
      const rowStart = Number(sched.rowStart || 1);
      const rowEnd = Number(sched.rowEnd || rowStart);
      const cols = sched.columns || [];
      const rows = [];

      for (let i = 0; i <= (rowEnd - rowStart); i++) {
        const rowObj = {};
        let hasAny = false;

        for (const colDef of cols) {
          const el = document.getElementById(`schedule-${sched.key}-${i}-${colDef.field}`);
          if (!el) continue;
          let val = el.value;
          if (colDef.type === "number") {
            val = val === "" ? null : Number(val);
          }
          if (val !== null && val !== "") hasAny = true;
          rowObj[colDef.field] = val;
        }

        if (hasAny) {
          rows.push(rowObj);
        }
      }

      schedules[sched.key] = rows;
    }

    data.schedules = schedules;
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
