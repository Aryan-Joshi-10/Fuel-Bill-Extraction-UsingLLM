import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import openpyxl
import json
from werkzeug.utils import secure_filename
from pdf2image import convert_from_bytes
from flask_cors import CORS
import traceback
import sys
import subprocess

# === Initial Setup ===
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload settings
app.config["UPLOAD_FOLDER"] = "uploads"
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50MB max file size
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


def check_poppler_installation():
    try:
        # Try to find pdfinfo in PATH
        try:
            result = subprocess.run(['where', 'pdfinfo'], capture_output=True, text=True)
            if result.returncode == 0:
                print(f"Poppler found at: {result.stdout.strip()}")
                return True
            else:
                print("Poppler not found in PATH")
                return False
        except Exception as e:
            print(f"Error checking for pdfinfo: {str(e)}")
            return False

        # Try to convert a simple PDF to check if poppler is installed
        from pdf2image.exceptions import PDFInfoNotInstalledError
        try:
            convert_from_bytes(b'%PDF-1.4\n%EOF', first_page=1, last_page=1)
            return True
        except PDFInfoNotInstalledError:
            print("PDFInfoNotInstalledError: Poppler is not installed")
            return False
        except Exception as e:
            print(f"Error testing PDF conversion: {str(e)}")
            return False
    except Exception as e:
        print(f"Error in check_poppler_installation: {str(e)}")
        return False


# Check poppler installation at startup
print("\n=== Checking Poppler Installation ===")
if not check_poppler_installation():
    print("\nWARNING: Poppler is not installed or not in PATH. PDF processing will not work.")
    print("\nPlease follow these steps:")
    print("1. Download Poppler from: https://github.com/oschwartz10612/poppler-windows/releases/")
    print("2. Extract it to a folder (e.g., C:\\poppler)")
    print("3. Add the bin directory to your PATH:")
    print("   - Open System Properties > Advanced > Environment Variables")
    print("   - Under System Variables, find and select 'Path'")
    print("   - Click Edit > New")
    print("   - Add the path to the poppler bin directory (e.g., C:\\poppler\\bin)")
    print("   - Click OK on all windows")
    print("4. Restart your terminal/IDE")
    print("\nCurrent PATH:")
    print(os.environ.get('PATH', '').replace(';', '\n'))
else:
    print("Poppler is installed and working correctly!")


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

            # Save the file first
            f.save(filepath)

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

            try:
                if filename.lower().endswith(".pdf"):
                    if not check_poppler_installation():
                        results.append({
                            "file": filename,
                            "error": "PDF processing is not available. Please install poppler on the server."
                        })
                        continue

                    try:
                        # Try to get page count first
                        from pdf2image.pdf2image import convert_from_path
                        try:
                            # First try with bytes
                            pdf_images = convert_from_bytes(file_content)
                            if not pdf_images:
                                # If that fails, try with file path
                                pdf_images = convert_from_path(filepath)

                            if not pdf_images:
                                raise Exception("No pages found in PDF")

                            images_to_process.extend(pdf_images)
                            print(f"Successfully processed PDF: {filename} with {len(pdf_images)} pages")

                        except Exception as e:
                            print(f"Error processing PDF {filename}: {str(e)}")
                            results.append({
                                "file": filename,
                                "error": f"Error processing PDF: {str(e)}"
                            })
                            continue

                    except Exception as e:
                        print(f"Error in PDF processing: {str(e)}")
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
                print(f"Error processing file {filename}: {str(e)}")
                results.append({
                    "file": filename,
                    "error": f"Error processing file: {str(e)}"
                })
                continue

        return jsonify({
            "success": True,
            "results": results
        }), 200

    except Exception as e:
        print(f"Error in upload handler: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# === Dummy Route ===
@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"message": "API is live 🚀"}), 200


# === Main ===
if __name__ == "__main__":
    app.run(debug=True)