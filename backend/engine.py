# backend/engine.py
# Generic calculation engine — works with any Excel + config.json

import uuid
import shutil
import subprocess
import tempfile
from pathlib import Path

import openpyxl

from config import LIBREOFFICE_BIN


def _get_session_dirs():
    base = Path(tempfile.gettempdir()) / "rater_sessions"
    input_dir = base / "input"
    output_dir = base / "output"
    input_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    return input_dir, output_dir


def calculate(template_path: Path, config: dict, input_data: dict, keep_file: bool = False) -> dict:
    """
    Generic calculation cycle.

    Args:
        template_path: path to the master .xlsx template (never modified)
        config: dict with "sheet", "inputs", "outputs" keys
        input_data: dict of { field_name: value } from the user form
        keep_file: if True, keep the output .xlsx and return its path

    Returns:
        dict of output values keyed by field name
    """
    session_id = str(uuid.uuid4())
    input_dir, output_dir = _get_session_dirs()
    session_file = input_dir / f"{session_id}.xlsx"
    output_file = output_dir / f"{session_id}.xlsx"

    # Build lookup: field_name -> cell reference
    input_map = {inp["field"]: inp["cell"] for inp in config["inputs"]}
    output_map = {out["field"]: out["cell"] for out in config["outputs"]}
    sheet_name = config["sheet"]

    try:
        # Step 1: Copy template
        shutil.copy(template_path, session_file)

        # Step 2: Write inputs
        wb = openpyxl.load_workbook(session_file)
        ws = wb[sheet_name]

        for field, value in input_data.items():
            cell_ref = input_map.get(field)
            if cell_ref:
                ws[cell_ref] = value

        wb.save(session_file)
        wb.close()

        # Step 3: LibreOffice recalculation
        result = subprocess.run(
            [
                LIBREOFFICE_BIN,
                "--headless",
                "--calc",
                "--convert-to", "xlsx",
                "--outdir", str(output_dir),
                str(session_file),
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"LibreOffice failed (exit={result.returncode}): "
                f"stderr={result.stderr.strip()}"
            )

        if not output_file.exists():
            raise RuntimeError(
                f"LibreOffice did not produce output file. "
                f"stdout={result.stdout.strip()}"
            )

        # Step 4: Read outputs
        wb_out = openpyxl.load_workbook(output_file, data_only=True)
        ws_out = wb_out[sheet_name]

        outputs = {}
        for field, cell_ref in output_map.items():
            val = ws_out[cell_ref].value
            if isinstance(val, float):
                val = round(val, 4)
            outputs[field] = val

        wb_out.close()

        if keep_file:
            outputs["_output_file"] = str(output_file)

        return outputs

    finally:
        # Step 5: Cleanup
        if session_file.exists():
            try:
                session_file.unlink()
            except OSError:
                pass
        if not keep_file and output_file.exists():
            try:
                output_file.unlink()
            except OSError:
                pass
