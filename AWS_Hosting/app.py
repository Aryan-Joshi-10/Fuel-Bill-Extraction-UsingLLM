import os
import json
import time
import traceback
import logging
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv
from PIL import Image
import openpyxl
import pdfplumber
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import status
from typing import List

import boto3
from botocore.exceptions import NoCredentialsError

# === Initial Setup ===
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
os.makedirs('logs', exist_ok=True)
file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter('%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'))
logger.addHandler(file_handler)

# Configure Setup
try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel("gemini-2.5-flash")

    # === Excel Setup ===
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Petrol Pump Name", "Date", "Product", "Volume(L)", "Rate per Litre", "Total Amount (Rs)"])

    # === AWS Setup ===
    S3_BUCKET = os.getenv("S3_BUCKET_NAME", "my-fuelbills-uploads")
    s3_client = boto3.client("s3")

except Exception as e:
    logger.error(f"Failed to configure Gemini: {str(e)}")
    raise

# FastAPI app initialization
app = FastAPI(title="Fuel Bill Extractor API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure upload folder
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 50 * 1024 * 1024))
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# === Helper Functions ===
def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_old_files():
    """Removes uploaded files older than 24 hours"""
    try:
        current_time = time.time()
        for filename in os.listdir(UPLOAD_FOLDER):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.getmtime(filepath) < current_time - 86400:
                os.remove(filepath)
                logger.info(f"Cleaned up old file: {filename}")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")


# === Prompt ===
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
"""


# === Core Processing ===
def process_image(image, fuel_bill_no):
    try:
        response = model.generate_content([prompt, image])
        content = response.text.strip()

        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        data = json.loads(content)

        # Estimate total if missing
        if not data.get("Total Amount (Rs)", "").strip() and data.get("Volume(L)") and data.get("Rate per Litre"):
            try:
                total = round(float(data["Volume(L)"]) * float(data["Rate per Litre"]), 2)
                data["Total Amount (Rs)"] = str(total)
            except ValueError:
                pass

        return {"file": fuel_bill_no, "data": data}

    except Exception as e:
        return {"file": fuel_bill_no, "error": str(e)}


# === Routes ===

@app.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        cleanup_old_files()

        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        results = []

        for file in files:
            filename = file.filename
            if not allowed_file(filename):
                results.append({
                    "file": filename,
                    "error": "Invalid file type. Allowed: PDF, PNG, JPG, JPEG"
                })
                continue

            # filepath = os.path.join(UPLOAD_FOLDER, filename)
            # with open(filepath, "wb") as buffer:
            #     buffer.write(await file.read())
            filepath = await file.read()
            try:
                s3_client.put_object(
                    Bucket=S3_BUCKET,
                    Key=f"uploads/{filename}",
                    Body=filepath,
                    ContentType=file.content_type
                )
                logger.info(f"✅ Uploaded {filename} to S3 bucket: {S3_BUCKET}")
            except NoCredentialsError:
                logger.error("❌ AWS credentials not found")
                raise HTTPException(status_code=500, detail="AWS credentials not configured")


            images_to_process = []

            try:
                if filename.lower().endswith(".pdf"):
                    with pdfplumber.open(filepath) as pdf:
                        if not pdf.pages:
                            raise Exception("No pages found in PDF")
                        for page in pdf.pages:
                            img = page.to_image(resolution=300).original
                            images_to_process.append(img)
                else:
                    img = Image.open(filepath)
                    images_to_process.append(img)
            except Exception as e:
                logger.error(f"Error processing {filename}: {str(e)}")
                results.append({"file": filename, "error": str(e)})
                continue

            for i, img in enumerate(images_to_process):
                fuel_bill_no = f"{os.path.splitext(filename)[0]}_page{i + 1}" if len(images_to_process) > 1 else os.path.splitext(filename)[0]
                result = process_image(img, fuel_bill_no)
                print(result)
                results.append(result)

                ws.append([
                    result["data"].get("Petrol Pump Name", ""),
                    result["data"].get("Date", ""),
                    result["data"].get("Product", ""),
                    result["data"].get("Volume(L)", ""),
                    result["data"].get("Rate per Litre", ""),
                    result["data"].get("Total Amount (Rs)", "")
                ])

            os.remove(filepath)

        # === Save workbook ===
        output_file = "extracted_bills.xlsx"
        wb.save(output_file)
        print(f"\n✅ Extraction complete. Excel saved at: {output_file}")

        return JSONResponse(
            status_code=200, 
            content=
            {
                "success": True, 
                "results": results
            }
        )

    except Exception as e:
        logger.error(f"Error in upload: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e), "traceback": traceback.format_exc()},
        )


@app.get("/health")
async def health_check():
    try:
        test_response = model.generate_content("Test")
        gemini_status = "healthy" if test_response else "unhealthy"
        upload_dir_status = "healthy" if os.access(UPLOAD_FOLDER, os.W_OK) else "unhealthy"

        return JSONResponse(
            status_code=200,
            content={
                "status": "healthy",
                "components": {
                    "gemini_api": gemini_status,
                    "upload_directory": upload_dir_status,
                    "pdf_processing": "healthy"
                },
            },
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(status_code=500, content={"status": "unhealthy", "error": str(e)})


# === Startup Info ===
@app.on_event("startup")
def startup_event():
    logger.info("🚀 FastAPI server started successfully.")


# === Main (for local run) ===
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting FastAPI on port {port}")
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
