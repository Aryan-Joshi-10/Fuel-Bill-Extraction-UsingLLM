import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import openpyxl
import json
from werkzeug.utils import secure_filename
from pdf2image import convert_from_bytes

# === Initial Setup ===
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

app = Flask(__name__)
app.config["UPLOAD_FOLDER"] = "uploads"
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

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

        return { "file": fuel_bill_no, "data": data }

    except Exception as e:
        return { "file": fuel_bill_no, "error": str(e) }

# === Route: Upload & Extract Data ===
@app.route('/upload', methods=['POST'])
def upload_files():
    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files uploaded"}), 400

    results = []
    for f in files:
        filename = secure_filename(f.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        f.save(filepath)

        images_to_process = []

        if filename.lower().endswith(".pdf"):
            pdf_images = convert_from_bytes(f.read())
            images_to_process.extend(pdf_images)
        else:
            try:
                img = Image.open(filepath)
                images_to_process.append(img)
            except Exception as e:
                results.append({ "file": filename, "error": str(e) })
                continue

        for i, img in enumerate(images_to_process):
            fuel_bill_no = f"{os.path.splitext(filename)[0]}_page{i+1}" if len(images_to_process) > 1 else os.path.splitext(filename)[0]
            result = process_image(img, fuel_bill_no)
            results.append(result)

    return jsonify(results), 200

# === Dummy Route ===
@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"message": "API is live 🚀"}), 200

# === Main ===
if __name__ == "__main__":
    app.run(debug=True)
