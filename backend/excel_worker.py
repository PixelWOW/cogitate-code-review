import queue
import threading
import time
import traceback
import tempfile
import uuid
from copy import copy
from pathlib import Path
from typing import Any, Dict

import pythoncom
import win32com.client

from engine import _coerce_by_type, _write_schedule_inputs


class ComWorksheetAdapter:
    def __init__(self, ws):
        self.ws = ws

    def __setitem__(self, key, value):
        self.ws.Range(key).Value = value


class ExcelWorker(threading.Thread):
    def __init__(self, upload_id: str, workbook_path: Path, config: Dict[str, Any]):
        super().__init__(name=f"ExcelWorker-{upload_id}")
        self.upload_id = upload_id
        import os
        path_str = str(workbook_path.resolve())
        # Force Windows slashes; Workbooks.Open is notoriously strict
        path_str = os.path.abspath(path_str).replace("/", "\\")
        self.workbook_path = path_str
        self._repaired_workbook_path = None
        self._repair_error = None
        self.config = config

        self.request_queue = queue.Queue()
        self.response_queue = queue.Queue()
        self.daemon = True
        self.is_ready = False
        self.error = None

    def run(self):
        try:
            pythoncom.CoInitialize()
            self.app = win32com.client.DispatchEx("Excel.Application")
            self.app.Visible = False
            self.app.DisplayAlerts = False
            self.app.AskToUpdateLinks = False
            self.app.EnableEvents = False
            self.app.ScreenUpdating = False
            try:
                # msoAutomationSecurityForceDisable
                self.app.AutomationSecurity = 3
            except Exception:
                pass
            # -4135 is xlCalculationManual
            self.wb = self._open_workbook_with_retries()
            self.app.Calculation = -4135
            self.sheet_name = self.config.get('sheet', 'Sheet1')
            self.input_map = {
                inp["field"]: inp["cell"]
                for inp in self.config.get("inputs", [])
                if inp.get("field") and inp.get("cell")
            }
            self.input_type_map = {
                inp["field"]: inp.get("type", "text")
                for inp in self.config.get("inputs", [])
                if inp.get("field")
            }
            self.output_map = {
                out["field"]: out["cell"]
                for out in self.config.get("outputs", [])
                if out.get("field") and out.get("cell")
            }

            self.is_ready = True

            while True:
                msg = self.request_queue.get()
                if msg["type"] == "shutdown":
                    break
                elif msg["type"] == "calculate":
                    try:
                        results, timings, out_file = self._do_calculation(msg["inputs"], keep_file=msg.get("keep_file", False))
                        self.response_queue.put({
                            "status": "success",
                            "outputs": results,
                            "timings": timings,
                            "out_file": out_file
                        })
                    except Exception as e:
                        self.response_queue.put({"status": "error", "error": str(e)})

        except Exception as e:
            self.error = str(e)
            print(f"[{self.name}] Error in Excel worker initialization/loop: {e}")
            print(traceback.format_exc())
            self.response_queue.put({"status": "error", "error": str(e)})
        finally:
            try:
                if hasattr(self, 'wb'):
                    self.wb.Close(SaveChanges=False)
                if hasattr(self, 'app'):
                    self.app.Quit()
            except Exception:
                pass
            if self._repaired_workbook_path:
                try:
                    Path(self._repaired_workbook_path).unlink(missing_ok=True)
                except Exception:
                    pass
            pythoncom.CoUninitialize()

    def _write_cell(self, default_sheet_name: str, cell_ref: str, value: Any) -> None:
        if "!" in cell_ref:
            sheet_part, coord = cell_ref.split("!", 1)
            sheet_part = sheet_part.strip("'\"")
            self.wb.Sheets(sheet_part).Range(coord).Value = value
        else:
            self.wb.Sheets(default_sheet_name).Range(cell_ref).Value = value

    def _read_cell(self, default_sheet_name: str, cell_ref: str) -> Any:
        if "!" in cell_ref:
            sheet_part, coord = cell_ref.split("!", 1)
            sheet_part = sheet_part.strip("'\"")
            return self.wb.Sheets(sheet_part).Range(coord).Value
        else:
            return self.wb.Sheets(default_sheet_name).Range(cell_ref).Value

    def _open_workbook_with_retries(self):
        open_modes = [
            {
                "UpdateLinks": 0,
                "ReadOnly": True,
                "IgnoreReadOnlyRecommended": True,
                "CorruptLoad": 1,
            },
            {
                "UpdateLinks": 0,
                "ReadOnly": True,
                "IgnoreReadOnlyRecommended": True,
            },
            {
                "UpdateLinks": 0,
                "ReadOnly": False,
                "IgnoreReadOnlyRecommended": True,
            },
        ]

        last_error = None
        for mode in open_modes:
            for attempt in range(3):
                try:
                    return self.app.Workbooks.Open(self.workbook_path, **mode)
                except Exception as exc:
                    last_error = exc
                    time.sleep(0.4 * (attempt + 1))

        repaired_path = self._build_repaired_workbook_copy()
        if repaired_path:
            for mode in open_modes:
                for attempt in range(2):
                    try:
                        return self.app.Workbooks.Open(repaired_path, **mode)
                    except Exception as exc:
                        last_error = exc
                        time.sleep(0.4 * (attempt + 1))

        sanitized_path = self._build_sanitized_workbook_copy()
        if sanitized_path:
            for mode in open_modes:
                for attempt in range(2):
                    try:
                        return self.app.Workbooks.Open(sanitized_path, **mode)
                    except Exception as exc:
                        last_error = exc
                        time.sleep(0.4 * (attempt + 1))

        repair_detail = ""
        if self._repair_error:
            repair_detail = f" | repair_copy_failed={self._repair_error}"
        elif repaired_path:
            repair_detail = f" | repair_copy_used={repaired_path}"
        else:
            repair_detail = " | repair_copy_skipped"

        raise RuntimeError(f"Excel failed to open workbook '{self.workbook_path}': {last_error}{repair_detail}")

    def _build_repaired_workbook_copy(self) -> str | None:
        try:
            from openpyxl import load_workbook

            wb = load_workbook(self.workbook_path, data_only=False, keep_links=False)
            repaired_dir = Path(tempfile.gettempdir()) / "rater_sessions" / "repaired"
            repaired_dir.mkdir(parents=True, exist_ok=True)
            repaired_path = repaired_dir / f"{self.upload_id}-{uuid.uuid4().hex}.xlsx"
            wb.save(str(repaired_path))
            wb.close()
            self._repaired_workbook_path = str(repaired_path)
            return self._repaired_workbook_path
        except Exception as exc:
            self._repair_error = str(exc)
            print(f"[{self.name}] Failed to build repaired workbook copy: {exc}")
            return None

    def _build_sanitized_workbook_copy(self) -> str | None:
        try:
            from openpyxl import Workbook, load_workbook

            src = load_workbook(self.workbook_path, data_only=False, keep_links=False)
            dst = Workbook()
            if dst.worksheets:
                dst.remove(dst.worksheets[0])

            for src_ws in src.worksheets:
                dst_ws = dst.create_sheet(title=src_ws.title)
                for row in src_ws.iter_rows(min_row=1, max_row=src_ws.max_row, min_col=1, max_col=src_ws.max_column):
                    for src_cell in row:
                        if src_cell.value is None and src_cell.number_format == "General":
                            continue
                        dst_cell = dst_ws.cell(row=src_cell.row, column=src_cell.column, value=src_cell.value)
                        dst_cell.number_format = src_cell.number_format

                for dim in src_ws.column_dimensions:
                    dst_ws.column_dimensions[dim].width = src_ws.column_dimensions[dim].width

            for name in src.defined_names.values():
                dst.defined_names.add(copy(name))

            sanitized_dir = Path(tempfile.gettempdir()) / "rater_sessions" / "sanitized"
            sanitized_dir.mkdir(parents=True, exist_ok=True)
            sanitized_path = sanitized_dir / f"{self.upload_id}-{uuid.uuid4().hex}.xlsx"
            dst.save(str(sanitized_path))
            src.close()
            dst.close()
            self._repaired_workbook_path = str(sanitized_path)
            return self._repaired_workbook_path
        except Exception as exc:
            print(f"[{self.name}] Failed to build sanitized workbook copy: {exc}")
            return None

    def _do_calculation(self, input_data: dict[str, Any], keep_file: bool = False) -> tuple[dict[str, Any], dict[str, float], str]:
        timings = {
            "copy_ms": 0.0,
            "write_ms": 0.0,
            "calc_ms": 0.0,
            "read_ms": 0.0,
            "total_ms": 0.0,
        }
        out_file = ""
        total_start = time.perf_counter()

        # WRITE
        write_start = time.perf_counter()
        ws_com = self.wb.Sheets(self.sheet_name)
        ws_adapter = ComWorksheetAdapter(ws_com)

        schedule_cells = _write_schedule_inputs(ws_adapter, self.config, input_data)

        for field, value in input_data.items():
            if field in {"schedules", "_schedules"}:
                continue
            cell_ref = self.input_map.get(field)
            if cell_ref and cell_ref not in schedule_cells:
                val_type = self.input_type_map.get(field, "text")
                self._write_cell(self.sheet_name, cell_ref, _coerce_by_type(value, val_type))

        timings["write_ms"] = round((time.perf_counter() - write_start) * 1000, 3)

        # CALC
        calc_start = time.perf_counter()
        self.app.Calculate()
        timings["calc_ms"] = round((time.perf_counter() - calc_start) * 1000, 3)

        # READ
        read_start = time.perf_counter()
        outputs: dict[str, Any] = {}
        for field, cell_ref in self.output_map.items():
            val = self._read_cell(self.sheet_name, cell_ref)
            if isinstance(val, float):
                val = round(val, 4)
            # Sometimes COM returns None, or bizarre tuple types. We cast it similarly
            outputs[field] = val
        timings["read_ms"] = round((time.perf_counter() - read_start) * 1000, 3)

        # KEEP FILE
        if keep_file:
            import tempfile
            import uuid
            
            base = Path(tempfile.gettempdir()) / "rater_sessions" / "output"
            base.mkdir(parents=True, exist_ok=True)
            output_path = base / f"{uuid.uuid4()}.xlsx"
            self.wb.SaveCopyAs(str(output_path.resolve()))
            outputs["_output_file"] = str(output_path)
            out_file = str(output_path)

        timings["total_ms"] = round((time.perf_counter() - total_start) * 1000, 3)

        return outputs, timings, out_file

    def calculate_sync(self, input_data: dict[str, Any], keep_file: bool = False, timeout: float = 30.0) -> tuple[dict[str, Any], dict[str, float]]:
        if not self.is_ready:
            if self.error:
                raise RuntimeError(f"Excel worker failed to start: {self.error}")
            raise RuntimeError("Excel worker is not ready yet")
            
        self.request_queue.put({
            "type": "calculate",
            "inputs": input_data,
            "keep_file": keep_file
        })
        
        try:
            res = self.response_queue.get(timeout=timeout)
        except queue.Empty:
            raise TimeoutError("Excel calculation timed out")
            
        if res.get("status") == "error":
            raise RuntimeError(res.get("error"))
            
        return res["outputs"], res["timings"]

    def shutdown(self):
        self.request_queue.put({"type": "shutdown"})
        self.join(timeout=5.0)