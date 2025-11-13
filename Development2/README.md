Development2 (React + Node)
================================

This is a React + Node/Express conversion of the existing `Development` (HTML/CSS/JS + Python) app.

Structure
---------
- `frontend/`: React app (Vite)
- `backend/`: Node/Express API server

Local Setup
-----------
1) Backend
   - cd Development2/backend
   - npm install
   - npm run dev
   - Server runs on http://localhost:8000

2) Frontend
   - cd Development2/frontend
   - npm install
   - npm run dev
   - App runs on http://localhost:5173

Configuration
-------------
- The frontend proxies API calls to `http://localhost:8000/api` by default. Update `VITE_API_BASE` in `frontend/.env` if needed.

Feature Parity (initial)
------------------------
- Tabs layout (Tax Declaration, Fuel Bills, Driver Salary, Additional, Validation)
- Save/load tax declaration (in-memory on server)
- Driver salary input, auto-calc total, save/load, validate against declaration
- Fuel bills upload with progress (accepts PDF/PNG/JPG/JPEG), mock extraction, results table
- Generate CSV "Excel" export from extracted bills

Notes
-----
- This is a first pass conversion. Extraction logic is mocked in Node to return consistent structures (`bills_data`, `total_fuel_cost`, `total_bills` and also `bills`, `total_amount` for compatibility).
- Replace mocked extraction with your real logic as needed.


