# Quick Start Guide

## Prerequisites
- Python 3.8 or higher
- Google Gemini API key

## Setup Steps

### 1. Install Dependencies
```bash
cd Development
pip install -r requirements.txt
```

### 2. Configure Environment
Create a `.env` file in the `backend` directory:
```
GOOGLE_API_KEY=your_google_api_key_here
PORT=8000
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=52428800
```

### 3. Start Backend Server
```bash
cd backend
python main.py
```

The server will start on `http://localhost:8000`

### 4. Open Frontend
You have two options:

**Option A: Direct File**
- Open `frontend/index.html` directly in your browser
- Make sure the API_BASE in `script.js` points to `http://localhost:8000/api`

**Option B: Local Server (Recommended)**
```bash
cd frontend
python -m http.server 8080
```
Then open `http://localhost:8080` in your browser

## Usage Flow

1. **Tax Declaration Tab**: Enter your income tax declaration details
2. **Fuel Bills Tab**: Upload fuel bill images/PDFs to extract and calculate total cost
3. **Driver Salary Tab**: Enter driver salary details and validate
4. **Validation Tab**: Run overall validation to compare declared vs calculated amounts

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Troubleshooting

- **CORS Errors**: Make sure the backend is running and CORS is enabled
- **API Connection Failed**: Check that the API_BASE URL in `script.js` matches your backend port
- **File Upload Errors**: Ensure the `uploads` directory exists and is writable
- **Excel Generation Fails**: Check that the `outputs` directory exists

