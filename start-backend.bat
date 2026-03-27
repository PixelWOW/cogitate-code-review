@echo off
REM Backend startup script for MPL-Rater (Windows)

cd /d "%~dp0cogitate rater\backend"

echo 🚀 Starting MPL-Rater Backend...
echo 📍 Backend will be available at: http://localhost:8000
echo 📍 Health endpoint: http://localhost:8000/api/health
echo.
echo To test connection from frontend, the admin page will show:
echo   ✓ Backend Online (green indicator)
echo.
echo Or failed to connect if backend is not running
echo.
echo Press Ctrl+C to stop the backend.
echo.

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
