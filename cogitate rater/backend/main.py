# backend/main.py
# Generic Excel Rater API — no hardcoded rater references

import json
import uuid
import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse

import engine
import registry
import schema_parser
from config import UPLOADS_DIR, RATERS_DIR, TEMPLATES_DIR

app = FastAPI(
    title="Excel Rater System",
    description="Generic Excel-based rating engine",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root_redirect():
    return RedirectResponse(url="/docs")


# ===================================================================
# HEALTH & STATUS
# ===================================================================

@app.get("/api/health")
def health_check():
    """Health check endpoint for frontend connection testing."""
    return {
        "status": "ok",
        "version": "2.0.0",
        "message": "Backend is running and accepting requests"
    }


# ===================================================================
# RATERS — live raters from raters/ folder
# ===================================================================

@app.get("/api/raters")
def api_list_raters():
    return registry.list_raters()


@app.get("/api/raters/{slug}/config")
def api_rater_config(slug: str):
    try:
        return registry.load_config("raters", slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/raters/{slug}/calculate")
async def api_rater_calculate(slug: str, request: Request):
    inputs = await request.json()
    try:
        config = registry.load_config("raters", slug)
        template_path = registry.get_template_path("raters", slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        results = engine.calculate(template_path, config, inputs)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")

    return {"status": "success", "outputs": results}


@app.post("/api/raters/{slug}/calculate-and-download")
async def api_rater_download(slug: str, request: Request):
    inputs = await request.json()
    try:
        config = registry.load_config("raters", slug)
        template_path = registry.get_template_path("raters", slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        results = engine.calculate(template_path, config, inputs, keep_file=True)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")

    output_path = results.get("_output_file")
    if not output_path or not Path(output_path).exists():
        raise HTTPException(status_code=500, detail="Output file not found")

    return FileResponse(
        path=output_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{slug}_calculated.xlsx",
    )


# ===================================================================
# TEMPLATES — test raters from templates/ folder
# ===================================================================

@app.get("/api/templates")
def api_list_templates():
    return registry.list_templates()


@app.get("/api/templates/{name}/config")
def api_template_config(name: str):
    try:
        return registry.load_config("templates", name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/templates/{name}/calculate")
async def api_template_calculate(name: str, request: Request):
    inputs = await request.json()
    try:
        config = registry.load_config("templates", name)
        template_path = registry.get_template_path("templates", name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        results = engine.calculate(template_path, config, inputs)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")

    return {"status": "success", "outputs": results}


@app.post("/api/templates/{name}/calculate-and-download")
async def api_template_download(name: str, request: Request):
    inputs = await request.json()
    try:
        config = registry.load_config("templates", name)
        template_path = registry.get_template_path("templates", name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    try:
        results = engine.calculate(template_path, config, inputs, keep_file=True)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")

    output_path = results.get("_output_file")
    if not output_path or not Path(output_path).exists():
        raise HTTPException(status_code=500, detail="Output file not found")

    return FileResponse(
        path=output_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"{name}_calculated.xlsx",
    )


# ===================================================================
# ADMIN — upload, parse, test-calculate, save
# ===================================================================

@app.post("/api/admin/upload")
async def api_admin_upload(file: UploadFile = File(...)):
    """Upload Excel, parse _Schema sheet, return config preview + upload_id."""
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")

    upload_id = str(uuid.uuid4())
    upload_path = UPLOADS_DIR / f"{upload_id}.xlsx"

    with open(upload_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        config = schema_parser.parse_schema(upload_path)
    except ValueError as e:
        upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        upload_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Error parsing Excel: {e}")

    return {
        "upload_id": upload_id,
        "filename": file.filename,
        "config": config,
    }


@app.post("/api/admin/test-calculate")
async def api_admin_test_calculate(request: Request):
    """Test calculate using a temporarily uploaded file + config."""
    payload = await request.json()
    upload_id = payload.get("upload_id")
    config = payload.get("config")
    inputs = payload.get("inputs", {})

    if not upload_id or not config:
        raise HTTPException(status_code=400, detail="upload_id and config are required")

    upload_path = UPLOADS_DIR / f"{upload_id}.xlsx"
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Upload not found — please re-upload the file")

    try:
        results = engine.calculate(upload_path, config, inputs)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")

    return {"status": "success", "outputs": results}


@app.post("/api/admin/test-download")
async def api_admin_test_download(request: Request):
    """Test calculate and return the calculated Excel file for verification."""
    payload = await request.json()
    upload_id = payload.get("upload_id")
    config = payload.get("config")
    inputs = payload.get("inputs", {})

    if not upload_id or not config:
        raise HTTPException(status_code=400, detail="upload_id and config are required")

    upload_path = UPLOADS_DIR / f"{upload_id}.xlsx"
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Upload not found — please re-upload the file")

    try:
        results = engine.calculate(upload_path, config, inputs, keep_file=True)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {e}")

    output_path = results.get("_output_file")
    if not output_path or not Path(output_path).exists():
        raise HTTPException(status_code=500, detail="Output file not found")

    return FileResponse(
        path=output_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="test_calculated.xlsx",
    )


@app.post("/api/admin/save")
async def api_admin_save(request: Request):
    """Approve: save uploaded Excel + config to raters/<slug>/ or templates/<slug>/."""
    payload = await request.json()
    upload_id = payload.get("upload_id")
    config = payload.get("config")
    slug = payload.get("slug", "").strip()
    name = payload.get("name", "").strip()
    description = payload.get("description", "").strip()
    source = payload.get("source", "raters").strip()

    if source not in {"raters", "templates"}:
        raise HTTPException(status_code=400, detail="source must be 'raters' or 'templates'")

    if not upload_id or not config or not slug:
        raise HTTPException(status_code=400, detail="upload_id, config, and slug are required")

    upload_path = UPLOADS_DIR / f"{upload_id}.xlsx"
    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Upload not found — please re-upload the file")

    # Create destination directory
    base_dir = RATERS_DIR if source == "raters" else TEMPLATES_DIR
    rater_dir = base_dir / slug
    if rater_dir.exists():
        raise HTTPException(status_code=409, detail=f"Rater '{slug}' already exists in {source}")

    rater_dir.mkdir(parents=True, exist_ok=True)

    try:
        # Copy template
        shutil.copy(upload_path, rater_dir / "template.xlsx")

        # Write config
        (rater_dir / "config.json").write_text(
            json.dumps(config, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        # Write meta
        meta = {
            "name": name or slug,
            "slug": slug,
            "description": description,
        }
        (rater_dir / "meta.json").write_text(
            json.dumps(meta, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        # Clean up temp upload
        upload_path.unlink(missing_ok=True)

    except Exception as e:
        # Rollback on failure
        if rater_dir.exists():
            shutil.rmtree(rater_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Failed to save rater: {e}")

    return {
        "status": "success",
        "slug": slug,
        "source": source,
        "message": f"Rater '{name or slug}' saved to {source}/{slug}/",
    }


# ===================================================================
# HEALTH
# ===================================================================

@app.get("/health")
def health():
    return {
        "status": "ok",
        "raters_count": len(registry.list_raters()),
        "templates_count": len(registry.list_templates()),
    }


