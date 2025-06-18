# 🚗 Fuel Bill Extraction using Google Gemini API

🌐 **Live Project**: [https://termsheet-validation-zs99.vercel.app/bill-extraction](https://termsheet-validation-zs99.vercel.app/bill-extraction)


This project extracts structured information from scanned **diesel/petrol fuel bill images or PDFs** using the powerful **Google Gemini 1.5 Flash** multimodal model. The extracted fields are translated to English and saved into a clean **Excel spreadsheet**, ideal for **income tax documentation**, **fuel reimbursement**, or **expense tracking**.

---

## ✨ Features

- 🌐 **Multilingual Support** – Works with bills written in **Marathi**, **Hindi**, and **English**
- 📷 **Flexible Input** – Accepts both **image formats** (`.png`, `.jpg`, `.jpeg`) and **PDF files**
- 🤖 **AI-Powered Extraction** – Leverages **Gemini 1.5 Flash** (Vision-Language Model) for intelligent field recognition
- 📊 **Auto-formatted Output** – Extracts key billing fields and exports them to an `.xlsx` spreadsheet

### 🔍 Extracted Fields

- **Petrol Pump Name**
- **Product** *(Petrol/Diesel)*
- **Date**
- **Volume** *(in Liters)*
- **Rate per Liter**
- **Total Amount (Rs)**

---

## 🧩 Technologies Used

| Tool / Library           | Purpose                                      |
|--------------------------|----------------------------------------------|
| 🧠 Google Gemini 1.5 Flash | Vision + Language model for image parsing    |
| 🔗 `google-generativeai`  | Gemini API integration for Python            |
| 🖼️ `Pillow`               | Image loading and manipulation               |
| 📊 `openpyxl`             | Writing structured data to Excel spreadsheets |


---

