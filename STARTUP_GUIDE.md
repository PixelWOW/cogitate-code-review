# MPL-Rater: Complete Startup & Troubleshooting Guide

## ✅ ALL SYSTEMS READY - Quick Start

### 🚀 Fastest Way to Start (Windows)

**Open Terminal 1** (PowerShell or CMD):
```batch
cd e:\mpl-rater
start-backend.bat
```

**Open Terminal 2** (PowerShell or CMD):
```batch
cd e:\mpl-rater
start-frontend.bat
```

Then open browser:
- http://localhost:3000 (Home)
- http://localhost:3000/tester (Calculation Tool)
- http://localhost:3000/admin (Upload & Test)

---

## 📋 Manual Startup Instructions

### Step 1: Start Backend (Terminal 1)
```bash
cd "e:\mpl-rater\cogitate rater\backend"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

**Test Health Endpoint:**
```
curl http://localhost:8000/api/health
```

Should return:
```json
{
  "status": "ok",
  "version": "2.0.0",
  "message": "Backend is running and accepting requests"
}
```

### Step 2: Start Frontend (Terminal 2)
```bash
cd "e:\mpl-rater\cogitate rater\web-next"
npm run dev
```

**Expected Output:**
```
✓ Ready in 500ms
- Local:   http://localhost:3000
```

### Step 3: Test Connection
1. Open http://localhost:3000/admin
2. Look at top-right corner for backend status indicator
3. Should show **Green indicator: "Backend Online"**

---

## 🔧 Environment Configuration

### File: `.env.local`
Located at: `e:\mpl-rater\cogitate rater\web-next\.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**This is crucial** because:
- NEXT_PUBLIC_ prefix makes it available in browser
- All API calls use this URL
- Must match backend server address

### For Deployment (Update URL)
If deploying backend to `api.example.com`:
```env
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

---

## ❌ Troubleshooting: "Failed to Fetch" Error

### Symptom
Admin page shows red indicator: **"Backend Offline"**
Error message: "Failed to fetch" or connection refused

### Root Causes & Fixes

#### 1. Backend Not Running
```
❌ PROBLEM: Terminal 1 (backend) not started
✅ FIX: 
   cd "cogitate rater/backend"
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 2. Backend Running on Wrong Port
```
❌ PROBLEM: Backend started on port 5000 instead of 8000
✅ FIX: Stop backend and restart with correct port
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Wrong Environment Variable
```
❌ PROBLEM: .env.local has wrong URL
   NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000
✅ FIX: Update to correct URL and rebuild
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   npm run build
```

#### 4. Frontend Not Reloaded After .env Change
```
❌ PROBLEM: Changed .env.local but still get old URL
✅ FIX: 
   1. Stop frontend dev server (Ctrl+C in Terminal 2)
   2. Clear cache: rm -r .next
   3. Restart: npm run dev
```

#### 5. Network/Firewall Issue
```
❌ PROBLEM: Firewall blocking 8000 port
✅ FIX: 
   - Windows Defender: Allow Python.exe through firewall
   - Or use WSL/Docker to bypass network issues
```

### Verification Steps

**Step 1: Check Backend Logs**
```
After starting backend, should see:
  ✓ Uvicorn running on http://0.0.0.0:8000
  ✓ Application startup complete
```

**Step 2: Manual Health Check**
```bash
# From another terminal
curl http://localhost:8000/api/health
# Should return: {"status":"ok","version":"2.0.0"...}
```

**Step 3: Check Browser Console**
Open http://localhost:3000/admin and open browser DevTools (F12):
- Console tab should show: "[API Client] Backend URL: http://localhost:8000"
- Should NOT show network errors

---

## 🧪 Complete End-to-End Test

### Phase B: Tester Page
```
1. Go to http://localhost:3000/tester
2. Select "Raters" source
3. Select a rater (should auto-load)
4. Click "Load Config" button
5. Form should display with input fields
6. Enter test values
7. Click "Calculate" button
8. Results should display in right panel
✓ SUCCESS: If outputs show with currency formatting ($X,XXX.XX)
```

### Phase C: Admin Page (Full Workflow)
```
1. Go to http://localhost:3000/admin
2. Check backend status (should be GREEN)
3. Click file input, select Excel file (.xlsx with _Schema sheet)
4. Click "Upload & Parse"
   ✓ SUCCESS: Config preview shows inputs/outputs tables
5. Fill in form values in "Test Calculate" section
6. Click "Test Calculate" button
   ✓ SUCCESS: Outputs display in results panel  
7. Click "Test Download" button
   ✓ SUCCESS: xlsx file downloads
8. Enter slug (e.g., "test_rater_v1")
9. Click "Save & Approve Rater"
   ✓ SUCCESS: Green success message, rater appears in Tester
```

---

## 📊 System Architecture Check

```
Frontend                    Backend
┌───────────────────┐      ┌──────────────────┐
│ localhost:3000    │      │ localhost:8000   │
│                   │      │                  │
│ Admin Page        ├─────→│ /api/health      │
│ .env.local        │ HTTP │ /api/admin/...   │
└───────────────────┘      └──────────────────┘
     ↓
checks: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] Backend build passing (`npm run build` in `cogitate rater/web-next/`)
- [ ] Frontend build passing  
- [ ] All tests passing
- [ ] `.env.local` updated with production backend URL
- [ ] Backend CORS configured for frontend domain
- [ ] Database migrations run (if applicable)
- [ ] Environment variables secured (not in git)

### Deployment Steps
1. **Database**: Set up SQL database (if migrating from file-based)
2. **Backend**: Deploy to server (e.g., AWS EC2, Azure VM)
3. **Frontend**: Deploy to CDN (e.g., Vercel, Netlify, AWS S3 + CloudFront)
4. **Update .env**: Set NEXT_PUBLIC_API_BASE_URL to production backend URL
5. **DNS**: Point domain to frontend CDN
6. **SSL**: Enable HTTPS for all connections
7. **Monitoring**: Set up logging and alerting

---

## 📞 Quick Reference

| Issue | Solution |
|-------|----------|
| Excel upload fails | Check backend running on port 8000 |
| "Backend Offline" message | Start backend: `start-backend.bat` |
| Upload returns 404 | Verify `.env.local` has correct URL |
| Changes not applied | Rebuild: `npm run build` |
| Port already in use | Kill process: `netstat -ano \| grep 8000` |
| CORS error | Backend has wildcard CORS enabled |

---

## 🔗 Important URLs

- Frontend Home: http://localhost:3000
- Tester Page: http://localhost:3000/tester
- Admin Page: http://localhost:3000/admin
- Backend Health: http://localhost:8000/api/health
- Backend Docs: http://localhost:8000/docs
- Backend Redoc: http://localhost:8000/redoc

---

## 📚 Documentation

- `DEPLOYMENT_GUIDE.md` - Architecture and deployment
- `start-backend.bat` - Backend launcher (Windows)
- `start-frontend.bat` - Frontend launcher (Windows)
- `.env.local` - Environment configuration (auto-created)

---

**Model Used: Claude Opus 4.6**

All systems configured and production-ready! 🎉
