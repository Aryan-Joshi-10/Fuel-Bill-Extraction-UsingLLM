import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import openpyxl
import json
from werkzeug.utils import secure_filename
#from pdf2image import convert_from_bytes
from flask_cors import CORS
import traceback
import sys
import subprocess
import logging
from logging.handlers import RotatingFileHandler
import shutil
import time
import pdfplumber

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

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload settings
app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "uploads")
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", 50 * 1024 * 1024))  # Default 50MB
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

# Create upload folder if it doesn't exist
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


# Cleanup old files (older than 24 hours)
def cleanup_old_files():
    try:
        current_time = time.time()
        for filename in os.listdir(app.config["UPLOAD_FOLDER"]):
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            if os.path.getmtime(filepath) < current_time - 86400:  # 24 hours
                os.remove(filepath)
                logger.info(f"Cleaned up old file: {filename}")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")


# Add error handler for 413 errors
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        "success": False,
        "error": "File too large. Maximum file size is 50MB."
    }), 413


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


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
"""  # keep same as your original prompt


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


# === Route: Upload & Extract Data ===
@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        # Cleanup old files before processing new ones
        cleanup_old_files()

        if 'files' not in request.files:
            return jsonify({"error": "No files part in the request"}), 400

        files = request.files.getlist("files")
        if not files:
            return jsonify({"error": "No files uploaded"}), 400

        results = []
        for f in files:
            if not f or not allowed_file(f.filename):
                results.append({
                    "file": f.filename if f else "unknown",
                    "error": "Invalid file type. Allowed types: PDF, PNG, JPG, JPEG"
                })
                continue

            filename = secure_filename(f.filename)
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)

            try:
                # Save the file first
                f.save(filepath)
                logger.info(f"Saved file: {filename}")

                # Read the file content
                with open(filepath, 'rb') as file:
                    file_content = file.read()

                if len(file_content) == 0:
                    results.append({
                        "file": filename,
                        "error": "File is empty"
                    })
                    continue

                images_to_process = []

                # if filename.lower().endswith(".pdf"):
                #     if not check_poppler_installation():
                #         results.append({
                #             "file": filename,
                #             "error": "PDF processing is not available. Please install poppler on the server."
                #         })
                #         continue
                #
                #     try:
                #         pdf_images = convert_from_bytes(file_content)
                #         if not pdf_images:
                #             raise Exception("No pages found in PDF")
                #
                #         images_to_process.extend(pdf_images)
                #         logger.info(f"Successfully processed PDF: {filename} with {len(pdf_images)} pages")
                #
                #     except Exception as e:
                #         logger.error(f"Error processing PDF {filename}: {str(e)}")
                #         results.append({
                #             "file": filename,
                #             "error": f"Error processing PDF: {str(e)}"
                #         })
                #         continue
                if filename.lower().endswith(".pdf"):
                    try:
                        with pdfplumber.open(filepath) as pdf:
                            if not pdf.pages:
                                raise Exception("No pages found in PDF")

                            for page in pdf.pages:
                                # Convert each page to an image
                                img = page.to_image(resolution=300).original
                                images_to_process.append(img)

                        logger.info(f"Successfully processed PDF: {filename} with {len(images_to_process)} pages")

                    except Exception as e:
                        logger.error(f"Error processing PDF {filename}: {str(e)}")
                        results.append({
                            "file": filename,
                            "error": f"Error processing PDF: {str(e)}"
                        })
                        continue
                else:
                    try:
                        img = Image.open(filepath)
                        images_to_process.append(img)
                    except Exception as e:
                        logger.error(f"Error opening image {filename}: {str(e)}")
                        results.append({
                            "file": filename,
                            "error": f"Error opening image: {str(e)}"
                        })
                        continue

                for i, img in enumerate(images_to_process):
                    fuel_bill_no = f"{os.path.splitext(filename)[0]}_page{i + 1}" if len(images_to_process) > 1 else \
                    os.path.splitext(filename)[0]
                    result = process_image(img, fuel_bill_no)
                    results.append(result)

            except Exception as e:
                logger.error(f"Error processing file {filename}: {str(e)}")
                results.append({
                    "file": filename,
                    "error": f"Error processing file: {str(e)}"
                })
                continue
            finally:
                # Clean up the file after processing
                try:
                    if os.path.exists(filepath):
                        os.remove(filepath)
                        logger.info(f"Cleaned up file: {filename}")
                except Exception as e:
                    logger.error(f"Error cleaning up file {filename}: {str(e)}")

        return jsonify({
            "success": True,
            "results": results
        }), 200

    except Exception as e:
        logger.error(f"Error in upload handler: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# === Health Check Route ===
@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Check if Gemini API is working
        test_response = model.generate_content("Test")
        gemini_status = "healthy" if test_response else "unhealthy"

        # Check if upload directory is writable
        upload_dir_status = "healthy" if os.access(app.config["UPLOAD_FOLDER"], os.W_OK) else "unhealthy"

        return jsonify({
            "status": "healthy",
            "components": {
                "gemini_api": gemini_status,
                "upload_directory": upload_dir_status,
                "pdf_processing": "healthy"  # If you want to retain the section
            }
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500


# === Main ===
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "production") == "development"

    logger.info(f"Starting server on port {port} in {'debug' if debug else 'production'} mode")
    app.run(host='0.0.0.0', port=port, debug=debug)