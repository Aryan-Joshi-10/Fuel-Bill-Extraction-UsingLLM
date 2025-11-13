# Income Tax Filing Automation Website

A comprehensive web application for automating income tax filing tasks, including fuel bill extraction, driver salary calculation, and declaration validation.

## Features

### 1. Income Tax Declaration
- Save and manage your income tax declaration details
- Track declared amounts for fuel expenses and driver salary
- Store financial year, PAN number, and other relevant information

### 2. Fuel Bills Extraction
- Upload multiple fuel bill images (PNG, JPG, JPEG) or PDFs
- AI-powered extraction using Google Gemini API
- Automatic calculation of total fuel cost
- Export extracted data to Excel file
- Supports multilingual bills (English, Hindi, Marathi)

### 3. Driver Salary Calculation
- Calculate total driver salary based on monthly salary and months worked
- Validate calculated salary against declared amount
- Store and manage driver salary details

### 4. Additional Features
- Placeholder section for future features

### 5. Overall Validation
- Comprehensive validation of all declared amounts
- Compare declared vs calculated values
- Visual indicators for validation status

## Project Structure

```
Development/
├── backend/
│   └── main.py          # FastAPI backend server
├── frontend/
│   ├── index.html       # Main HTML file
│   ├── styles.css       # Styling
│   └── script.js        # Frontend JavaScript
└── requirements.txt     # Python dependencies
```

## Setup Instructions

### Backend Setup

1. Install dependencies:
```bash
cd Development
pip install -r requirements.txt
```

2. Create a `.env` file in the `backend` directory:
```
GOOGLE_API_KEY=your_google_api_key_here
PORT=8000
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=52428800
```

3. Run the FastAPI server:
```bash
cd backend
python main.py
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Open the `frontend/index.html` file in a web browser, or

2. Use a local web server (recommended):
```bash
cd frontend
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

**Note:** Make sure to update the `API_BASE` constant in `script.js` if your backend is running on a different port.

## API Endpoints

### Declaration
- `GET /api/declaration` - Get saved declaration
- `POST /api/declaration` - Save declaration
- `PUT /api/declaration` - Update declaration

### Fuel Bills
- `POST /api/fuel-bills/upload` - Upload and extract fuel bills
- `POST /api/fuel-bills/generate-excel` - Generate Excel file from bills data

### Driver Salary
- `GET /api/driver-salary` - Get saved salary details
- `POST /api/driver-salary` - Save salary details
- `PUT /api/driver-salary` - Update salary details
- `POST /api/driver-salary/validate` - Validate salary against declaration

### Validation
- `GET /api/validate` - Run full validation

### Health Check
- `GET /health` - Check API health status

## Usage

1. **Start the backend server** (FastAPI)
2. **Open the frontend** in a web browser
3. **Fill in your tax declaration** details in the "Tax Declaration" tab
4. **Upload fuel bills** in the "Fuel Bills" tab to extract and calculate total cost
5. **Enter driver salary** details in the "Driver Salary" tab
6. **Run validation** in the "Validation" tab to compare declared vs calculated amounts

## Technologies Used

- **Backend:** FastAPI, Python
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **AI/ML:** Google Gemini API for image extraction
- **Data Processing:** OpenPyXL for Excel generation, PDFPlumber for PDF processing
- **Styling:** Modern CSS with gradients and animations

## Notes

- All data is stored locally in JSON files in the `data` directory
- Uploaded files are automatically cleaned up after 24 hours
- Excel files are saved in the `outputs` directory
- The application requires a valid Google Gemini API key

