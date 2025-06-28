import os
from dotenv import load_dotenv
from PIL import Image
import google.generativeai as genai
import openpyxl
import json

# === Load the API key from .env ===
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# === Use Gemini 1.5 Flash which supports image input ===
model = genai.GenerativeModel("gemini-1.5-flash")

# === Image folder path ===
image_folder = "images"  # Adjust as needed
image_files = [f for f in os.listdir(image_folder) if f.lower().endswith((".png", ".jpg", ".jpeg"))]

# === Excel Setup ===
wb = openpyxl.Workbook()
ws = wb.active
ws.append(["Fuel_bill_No.","Petrol Pump Name", "Date", "Product","Volume(L)", "Rate per Litre", "Total Amount (Rs)"])

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

# === Process each image ===
for img_file in image_files:
    image_path = os.path.join(image_folder, img_file)
    fuel_bill_no = os.path.splitext(img_file)[0]
    try:
        image = Image.open(image_path)

        # Use multimodal input: [text prompt, image]
        response = model.generate_content([prompt, image])

        content = response.text.strip()
        print("\n" + fuel_bill_no)
        print(f"🔍Response for {img_file}:\n{content}")

        # Remove code block formatting if present (```json ... ```)
        if content.startswith("```json"):
            content = content[7:-3].strip()
        elif content.startswith("```"):
            content = content[3:-3].strip()

        # Parse the cleaned JSON (Converted into Python object such as Dictionary)
        data = json.loads(content)

        # After json.loads(content)
        if not data.get("Total Amount (Rs)", "").strip() and data.get("Volume(L)") and data.get("Rate per Litre"):
            try:
                volume = float(data["Volume(L)"])
                rate = float(data["Rate per Litre"])
                total = round(volume * rate, 2)
                data["Total Amount (Rs)"] = str(total)
            except ValueError:
                print(f"⚠️ Error calculating Total Amount for {fuel_bill_no}: {e}")

        # ✅ Write to Excel
        ws.append([
            fuel_bill_no,
            data.get("Petrol Pump Name", ""),
            data.get("Date", ""),
            data.get("Product",""),
            data.get("Volume(L)", ""),
            data.get("Rate per Litre", ""),
            data.get("Total Amount (Rs)", "")
        ])

    except Exception as e:
        print(f"❌ Error processing {img_file}: {e}")

# === Save workbook ===
output_file = "extracted_bills.xlsx"
wb.save(output_file)
print(f"\n✅ Extraction complete. Excel saved at: {output_file}")


