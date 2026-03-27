@echo off
REM Frontend startup script for MPL-Rater (Windows)

cd /d "%~dp0cogitate rater\web-next"

echo 🚀 Starting MPL-Rater Frontend...
echo 📍 Frontend will be available at: http://localhost:3000
echo 📍 Tester page: http://localhost:3000/tester
echo 📍 Admin page: http://localhost:3000/admin
echo.
echo Backend must be running on http://localhost:8000
echo If backend is offline, admin page will show connection error
echo.
echo Press Ctrl+C to stop the frontend.
echo.

npm run dev
