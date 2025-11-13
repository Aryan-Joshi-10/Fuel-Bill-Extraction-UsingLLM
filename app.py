import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import openpyxl
import json
import traceback
import logging
from logging.handlers import RotatingFileHandler
import time
import pdfplumber
from datetime import datetime
from io import BytesIO
from typing import List, Optional
from pydantic import BaseModel

# === Initial Setup ===
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Add file handler for logging
file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
logger.addHandler(file_handler)

# Configure Gemini
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel("gemini-1.5-flash")
except Exception as e:
    logger.error(f"Failed to configure Gemini: {str(e)}")
    raise

# FastAPI app initialization
app = FastAPI(title="Income Tax Filing Automation API", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure upload settings
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 50 * 1024 * 1024))  # Default 50MB
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
EXCEL_DIR = "excel_outputs"
os.makedirs(EXCEL_DIR, exist_ok=True)

# File paths for storing data
DECLARATION_FILE = os.path.join(DATA_DIR, "tax_declaration.json")
DRIVER_SALARY_FILE = os.path.join(DATA_DIR, "driver_salary.json")
FUEL_BILLS_FILE = os.path.join(DATA_DIR, "fuel_bills.json")

# Mount static files for frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

# === Pydantic Models ===
class TaxDeclaration(BaseModel):
    financial_year: str
    declared_fuel_amount: float
    declared_driver_salary: float
    other_declarations: Optional[dict] = {}

class DriverSalary(BaseModel):
    driver_name: str
    monthly_salary: float
    months_worked: int
    total_amount: Optional[float] = None
    payment_proofs: Optional[List[str]] = []

# === Helper Functions ===
def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def cleanup_old_files():
    try:
        current_time = time.time()
        for filename in os.listdir(UPLOAD_FOLDER):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.getmtime(filepath) < current_time - 86400:  # 24 hours
                os.remove(filepath)
                logger.info(f"Cleaned up old file: {filename}")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")

def load_json_file(filepath: str, default: dict = None):
    """Load JSON data from file"""
    if default is None:
        default = {}
    try:
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                return json.load(f)
        return default
    except Exception as e:
        logger.error(f"Error loading {filepath}: {str(e)}")
        return default

def save_json_file(filepath: str, data: dict):
    """Save JSON data to file"""
    try:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        logger.error(f"Error saving {filepath}: {str(e)}")
        return False

# === Prompt for Gemini ===
prompt = """
You are a vision-language model tasked with extracting structured information from petrol or diesel bills. These bills may be in English, Hindi, or Marathi.
Your goal is to extract and return the following details in JSON format:

- **Petrol Pump Name**: The topmost prominent text, usually representing the petrol pump or brand name (e.g., "Tungar Petroleum").
- **Date**: The date of the transaction. It may appear near the bill number or be labeled as "Date:", "दिनांक", or "दि.". Return the date strictly in DD/MM/YYYY format.
- **Product**: Identify the type of fuel sold. Extract **only** the word "Petrol" or "Diesel". Do not include any numbers, prices, or quantities. Choose strictly between:
  - "Petrol"
  - "Diesel"
- **Volume(L)**: The value mentioned next to the label "VOLUME" or its equivalent.
- **Rate per Litre**: The rate of the fuel per litre. This is usually in the third column of a price table. For example, if shown as "91\n74", convert it to "91.74".
- **Total Amount (Rs)**: The final amount payable, generally found near the bottom-right under the label "AMOUNT" or "Rs." or "LKR". - When the Total Amount is not explicitly found, try to estimate based on tabular layout. For example, the last value in the third column of the price table usually corresponds to the final amount.

**Additional Instructions:**
- Translate all extracted information into English.
- If a particular field is missing or unclear in the image, leave its value as an empty string.
- Return the final result strictly in the following JSON format:

```json
{
  "Petrol Pump Name": "",
  "Date": "",
  "Product": "",
  "Volume(L)": "",
  "Rate per Litre": "",
  "Total Amount (Rs)": ""
}
```
"""

# === Helper: Process Single Image ===
def process_image(image, fuel_bill_no):
    try:
        response = model.generate_content([prompt, image])
        content = response.text.strip()

        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        data = json.loads(content)

        # Estimate Total if missing
        if not data.get("Total Amount (Rs)", "").strip() and data.get("Volume(L)") and data.get("Rate per Litre"):
            try:
                volume = float(data["Volume(L)"])
                rate = float(data["Rate per Litre"])
                total = round(volume * rate, 2)
                data["Total Amount (Rs)"] = str(total)
            except ValueError:
                pass

        return {"file": fuel_bill_no, "data": data}

    except Exception as e:
        return {"file": fuel_bill_no, "error": str(e)}

# === API Routes ===

@app.get("/")
async def root():
    """Serve the main HTML page"""
    try:
        return FileResponse("static/index.html")
    except:
        return {"message": "Please create the frontend HTML file"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        test_response = model.generate_content("Test")
        gemini_status = "healthy" if test_response else "unhealthy"
        upload_dir_status = "healthy" if os.access(UPLOAD_FOLDER, os.W_OK) else "unhealthy"

        return {
            "status": "healthy",
            "components": {
                "gemini_api": gemini_status,
                "upload_directory": upload_dir_status,
                "pdf_processing": "healthy"
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# === Income Tax Declaration Routes ===
@app.post("/api/tax-declaration")
async def save_tax_declaration(declaration: TaxDeclaration):
    """Save income tax declaration details"""
    try:
        data = declaration.dict()
        data["updated_at"] = datetime.now().isoformat()
        
        if save_json_file(DECLARATION_FILE, data):
            return {"success": True, "message": "Tax declaration saved successfully", "data": data}
        else:
            raise HTTPException(status_code=500, detail="Failed to save tax declaration")
    except Exception as e:
        logger.error(f"Error saving tax declaration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/tax-declaration")
async def get_tax_declaration():
    """Get income tax declaration details"""
    try:
        data = load_json_file(DECLARATION_FILE)
        if data:
            return {"success": True, "data": data}
        else:
            return {"success": True, "data": None, "message": "No declaration found"}
    except Exception as e:
        logger.error(f"Error getting tax declaration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# === Fuel Bills Routes ===
@app.post("/api/fuel-bills/upload")
async def upload_fuel_bills(files: List[UploadFile] = File(...)):
    """Upload and extract data from fuel bills"""
    try:
        cleanup_old_files()

        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        results = []
        all_bills_data = load_json_file(FUEL_BILLS_FILE, default={"bills": []})

        for file in files:
            if not file.filename or not allowed_file(file.filename):
                results.append({
                    "file": file.filename if file.filename else "unknown",
                    "error": "Invalid file type. Allowed types: PDF, PNG, JPG, JPEG"
                })
                continue

            # Save file temporarily
            filepath = os.path.join(UPLOAD_FOLDER, file.filename)
            try:
                with open(filepath, "wb") as buffer:
                    content = await file.read()
                    buffer.write(content)

                if len(content) == 0:
                    results.append({
                        "file": file.filename,
                        "error": "File is empty"
                    })
                    continue

                images_to_process = []

                if file.filename.lower().endswith(".pdf"):
                    try:
                        with pdfplumber.open(filepath) as pdf:
                            if not pdf.pages:
                                raise Exception("No pages found in PDF")

                            for page in pdf.pages:
                                img = page.to_image(resolution=300).original
                                images_to_process.append(img)

                        logger.info(f"Successfully processed PDF: {file.filename} with {len(images_to_process)} pages")

                    except Exception as e:
                        logger.error(f"Error processing PDF {file.filename}: {str(e)}")
                        results.append({
                            "file": file.filename,
                            "error": f"Error processing PDF: {str(e)}"
                        })
                        continue
                else:
                    try:
                        img = Image.open(filepath)
                        images_to_process.append(img)
                    except Exception as e:
                        logger.error(f"Error opening image {file.filename}: {str(e)}")
                        results.append({
                            "file": file.filename,
                            "error": f"Error opening image: {str(e)}"
                        })
                        continue

                for i, img in enumerate(images_to_process):
                    fuel_bill_no = f"{os.path.splitext(file.filename)[0]}_page{i + 1}" if len(images_to_process) > 1 else os.path.splitext(file.filename)[0]
                    result = process_image(img, fuel_bill_no)
                    results.append(result)

                    # Save to JSON if successful
                    if "data" in result:
                        all_bills_data["bills"].append({
                            "bill_no": fuel_bill_no,
                            "filename": file.filename,
                            "extracted_data": result["data"],
                            "extracted_at": datetime.now().isoformat()
                        })

            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                results.append({
                    "file": file.filename,
                    "error": f"Error processing file: {str(e)}"
                })
            finally:
                # Clean up the file after processing
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        logger.info(f"Cleaned up file: {file.filename}")
                except Exception as e:
                    logger.error(f"Error cleaning up file {file.filename}: {str(e)}")

        # Save all bills data
        save_json_file(FUEL_BILLS_FILE, all_bills_data)

        return {
            "success": True,
            "results": results,
            "total_bills": len([r for r in results if "data" in r])
        }

    except Exception as e:
        logger.error(f"Error in upload handler: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fuel-bills")
async def get_fuel_bills():
    """Get all extracted fuel bills"""
    try:
        data = load_json_file(FUEL_BILLS_FILE, default={"bills": []})
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error getting fuel bills: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fuel-bills/excel")
async def generate_fuel_bills_excel():
    """Generate Excel file from extracted fuel bills"""
    try:
        data = load_json_file(FUEL_BILLS_FILE, default={"bills": []})
        
        if not data.get("bills"):
            raise HTTPException(status_code=404, detail="No fuel bills found")

        # Create Excel workbook
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Fuel Bills"
        
        # Add headers
        headers = ["Fuel_bill_No.", "Petrol Pump Name", "Date", "Product", "Volume(L)", "Rate per Litre", "Total Amount (Rs)"]
        ws.append(headers)

        # Add data
        total_amount = 0
        for bill in data["bills"]:
            extracted = bill.get("extracted_data", {})
            ws.append([
                bill.get("bill_no", ""),
                extracted.get("Petrol Pump Name", ""),
                extracted.get("Date", ""),
                extracted.get("Product", ""),
                extracted.get("Volume(L)", ""),
                extracted.get("Rate per Litre", ""),
                extracted.get("Total Amount (Rs)", "")
            ])
            # Calculate total
            try:
                amount = float(extracted.get("Total Amount (Rs)", "0") or "0")
                total_amount += amount
            except:
                pass

        # Add total row
        ws.append([])
        ws.append(["TOTAL", "", "", "", "", "", f"Rs. {total_amount:.2f}"])

        # Save to BytesIO
        excel_buffer = BytesIO()
        wb.save(excel_buffer)
        excel_buffer.seek(0)

        # Save to file as well
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        excel_filename = f"extracted_bills_{timestamp}.xlsx"
        excel_filepath = os.path.join(EXCEL_DIR, excel_filename)
        wb.save(excel_filepath)

        return FileResponse(
            excel_filepath,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            filename=excel_filename
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating Excel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fuel-bills/summary")
async def get_fuel_bills_summary():
    """Get summary of fuel bills (total amount, count, etc.)"""
    try:
        data = load_json_file(FUEL_BILLS_FILE, default={"bills": []})
        
        total_amount = 0
        bill_count = len(data.get("bills", []))
        petrol_count = 0
        diesel_count = 0

        for bill in data.get("bills", []):
            extracted = bill.get("extracted_data", {})
            try:
                amount = float(extracted.get("Total Amount (Rs)", "0") or "0")
                total_amount += amount
            except:
                pass
            
            product = extracted.get("Product", "").lower()
            if "petrol" in product:
                petrol_count += 1
            elif "diesel" in product:
                diesel_count += 1

        return {
            "success": True,
            "summary": {
                "total_bills": bill_count,
                "total_amount": round(total_amount, 2),
                "petrol_bills": petrol_count,
                "diesel_bills": diesel_count
            }
        }
    except Exception as e:
        logger.error(f"Error getting fuel bills summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# === Driver Salary Routes ===
@app.post("/api/driver-salary")
async def save_driver_salary(salary: DriverSalary):
    """Save driver salary information"""
    try:
        # Calculate total if not provided
        if salary.total_amount is None:
            salary.total_amount = salary.monthly_salary * salary.months_worked

        data = salary.dict()
        data["updated_at"] = datetime.now().isoformat()
        
        # Load existing data
        all_salaries = load_json_file(DRIVER_SALARY_FILE, default={"salaries": []})
        all_salaries["salaries"].append(data)
        
        if save_json_file(DRIVER_SALARY_FILE, all_salaries):
            return {"success": True, "message": "Driver salary saved successfully", "data": data}
        else:
            raise HTTPException(status_code=500, detail="Failed to save driver salary")
    except Exception as e:
        logger.error(f"Error saving driver salary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/driver-salary")
async def get_driver_salary():
    """Get all driver salary information"""
    try:
        data = load_json_file(DRIVER_SALARY_FILE, default={"salaries": []})
        
        # Calculate totals
        total_salary = sum(s.get("total_amount", 0) for s in data.get("salaries", []))
        total_drivers = len(data.get("salaries", []))
        
        return {
            "success": True,
            "data": data,
            "summary": {
                "total_drivers": total_drivers,
                "total_salary_amount": round(total_salary, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error getting driver salary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/driver-salary/{index}")
async def delete_driver_salary(index: int):
    """Delete a driver salary entry by index"""
    try:
        all_salaries = load_json_file(DRIVER_SALARY_FILE, default={"salaries": []})
        
        if 0 <= index < len(all_salaries.get("salaries", [])):
            all_salaries["salaries"].pop(index)
            save_json_file(DRIVER_SALARY_FILE, all_salaries)
            return {"success": True, "message": "Driver salary deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Driver salary entry not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting driver salary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# === Main ===
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting FastAPI server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
