# backend/schema_parser.py
# Parses the _Schema sheet from an Excel file into a config dict

import openpyxl
from pathlib import Path


def parse_schema(xlsx_path: Path) -> dict:
    """
    Read the _Schema sheet from an Excel file and return a config dict.

    Expected _Schema columns:
      A: field    B: cell    C: type    D: label
      E: direction (input/output)    F: group    G: options (;-separated)    H: default

    Returns:
        { "sheet": str, "inputs": [...], "outputs": [...] }

    Raises:
        ValueError: if _Schema sheet is not found or is empty
    """
    wb = openpyxl.load_workbook(xlsx_path, data_only=True, read_only=True)

    if "_Schema" not in wb.sheetnames:
        wb.close()
        raise ValueError(
            "No '_Schema' sheet found in this Excel file. "
            "Each rater must have a '_Schema' sheet that declares its inputs and outputs."
        )

    ws = wb["_Schema"]

    # Detect the main rater sheet (first sheet that isn't _Schema)
    rater_sheet = None
    for name in wb.sheetnames:
        if name != "_Schema":
            rater_sheet = name
            break

    inputs = []
    outputs = []
    row_count = 0

    for row in ws.iter_rows(min_row=2, values_only=True):  # skip header
        # Unpack columns A-H
        field = row[0] if len(row) > 0 else None
        cell = row[1] if len(row) > 1 else None
        ftype = row[2] if len(row) > 2 else None
        label = row[3] if len(row) > 3 else None
        direction = row[4] if len(row) > 4 else None
        group = row[5] if len(row) > 5 else None
        options_raw = row[6] if len(row) > 6 else None
        default_raw = row[7] if len(row) > 7 else None

        # Skip empty rows
        if not field or not cell:
            continue

        row_count += 1
        field = str(field).strip()
        cell = str(cell).strip()
        ftype = str(ftype).strip() if ftype else "text"
        label = str(label).strip() if label else field
        direction = str(direction).strip().lower() if direction else "input"
        group = str(group).strip() if group else "General"

        # Parse options (semicolon-separated)
        options = []
        if options_raw and str(options_raw).strip():
            raw_parts = str(options_raw).split(";")
            for part in raw_parts:
                part = part.strip()
                if not part:
                    continue
                # Try to convert to number if all options look numeric
                try:
                    options.append(int(part))
                except ValueError:
                    try:
                        options.append(float(part))
                    except ValueError:
                        options.append(part)

        # Parse default value
        default = None
        if default_raw is not None and str(default_raw).strip():
            default = str(default_raw).strip()
            if ftype == "number":
                try:
                    default = float(default) if "." in default else int(default)
                except ValueError:
                    pass

        entry = {
            "field": field,
            "cell": cell,
            "type": ftype,
            "label": label,
            "group": group,
        }

        if direction == "output":
            entry["primary"] = (row_count == 1 and direction == "output") or field == "premium"
            outputs.append(entry)
        else:
            if options:
                entry["options"] = options
                entry["type"] = "dropdown"
            if default is not None:
                entry["default"] = default
            inputs.append(entry)

    wb.close()

    if row_count == 0:
        raise ValueError("_Schema sheet is empty — no field definitions found.")

    # Mark the first output as primary if none is marked
    if outputs and not any(o.get("primary") for o in outputs):
        outputs[0]["primary"] = True

    # Override rater_sheet with the _Schema data if we can find it from cell references
    # (all cells reference the same sheet implicitly)
    config = {
        "sheet": rater_sheet or "Sheet1",
        "inputs": inputs,
        "outputs": outputs,
    }

    return config
