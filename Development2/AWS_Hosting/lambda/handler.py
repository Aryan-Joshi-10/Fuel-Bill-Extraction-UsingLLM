import os
import io
import json
import base64
import boto3
import pdfplumber
from PIL import Image
import openpyxl
import google.generativeai as genai
from datetime import datetime

S3 = boto3.client('s3')
DDB = boto3.client('dynamodb')

OUTPUT_PREFIX = os.getenv('OUTPUT_PREFIX', 'output/')
TABLE_NAME = os.getenv('DDB_TABLE', 'FuelBillJobs')
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')

if not GOOGLE_API_KEY:
    # Allow function to be created without key; raise at runtime if missing
    pass
else:
    genai.configure(api_key=GOOGLE_API_KEY)

def _get_gemini_model():
    if not GOOGLE_API_KEY:
        raise RuntimeError("Missing GOOGLE_API_KEY environment variable")
    return genai.GenerativeModel(GEMINI_MODEL or 'gemini-2.5-flash')

def _s3_get_object_bytes(bucket, key):
    obj = S3.get_object(Bucket=bucket, Key=key)
    return obj['Body'].read()

def _extract_pages_from_pdf(content_bytes):
    pages = []
    with io.BytesIO(content_bytes) as bio:
        with pdfplumber.open(bio) as pdf:
            for page in pdf.pages:
                pages.append(page.to_image(resolution=200).original)  # PIL Image
    return pages

def _extract_image(content_bytes):
    return Image.open(io.BytesIO(content_bytes))

def _gemini_extract_from_images(images):
    model = _get_gemini_model()
    prompt = (
        "Extract structured fields from the fuel bill image(s): "
        "pump_name, bill_number, bill_date, liters, price_per_liter, total_amount. "
        "Return a JSON object with these keys."
    )
    parts = [{"text": prompt}]
    for img in images:
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=90)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": b64}})

    resp = model.generate_content(parts)
    try:
        text = resp.text.strip()
        data = json.loads(text)
    except Exception:
        data = {"raw_text": getattr(resp, "text", "")}
    return data

def _write_excel_row(data_dict):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "FuelBills"
    headers = [
        "pump_name", "bill_number", "bill_date",
        "liters", "price_per_liter", "total_amount"
    ]
    ws.append(headers)
    row = [data_dict.get(h, "") for h in headers]
    ws.append(row)
    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return out.getvalue()

def lambda_handler(event, context):
    # S3 trigger events
    for record in event.get('Records', []):
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Only process uploads/ prefix (configurable via template)
        if not key:
            continue

        created_at = datetime.utcnow().isoformat()

        try:
            content = _s3_get_object_bytes(bucket, key)

            images = []
            if key.lower().endswith('.pdf'):
                images = _extract_pages_from_pdf(content)
            else:
                images = [_extract_image(content)]

            data = _gemini_extract_from_images(images)

            # Save JSON to DynamoDB
            DDB.put_item(
                TableName=TABLE_NAME,
                Item={
                    'file_key': {'S': key},
                    'created_at': {'S': created_at},
                    'data': {'S': json.dumps(data)},
                    'job_status': {'S': 'COMPLETED'}
                }
            )

            # Write Excel to S3
            base_name = key.split('/')[-1].rsplit('.', 1)[0]
            out_key = f"{OUTPUT_PREFIX}{base_name}.xlsx"

            excel_bytes = _write_excel_row(data)
            S3.put_object(
                Bucket=bucket,
                Key=out_key,
                Body=excel_bytes,
                ContentType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )

        except Exception as e:
            DDB.put_item(
                TableName=TABLE_NAME,
                Item={
                    'file_key': {'S': key},
                    'created_at': {'S': created_at},
                    'error': {'S': str(e)},
                    'job_status': {'S': 'FAILED'}
                }
            )
            raise

    return {"ok": True}


