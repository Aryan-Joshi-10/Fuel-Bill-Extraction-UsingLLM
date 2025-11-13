import os
import json
import boto3
from urllib.parse import unquote_plus

DDB = boto3.client('dynamodb')
TABLE = os.getenv('DDB_TABLE')

SUMMARY_MAP = {
    "pump_name": "Petrol Pump Name",
    "bill_date": "Date",
    "product": "Product",
    "liters": "Volume(L)",
    "volume": "Volume(L)",
    "price_per_liter": "Rate per Litre",
    "rate_per_litre": "Rate per Litre",
    "total_amount": "Total Amount (Rs)",
    "amount": "Total Amount (Rs)",
    "product_name": "Product",
    "fuel_type": "Product",
}

def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body)
    }

def _parse_raw_block(raw_text: str):
    """Best-effort parse of Gemini responses that wrap JSON in ``` fences."""
    if not raw_text:
        return {}

    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
        cleaned = cleaned.lstrip()
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except Exception:
        return {"raw_text": raw_text}

def _normalize_data(parsed: dict):
    normalized = {}
    if not isinstance(parsed, dict):
        return normalized

    for key, value in parsed.items():
        if key in SUMMARY_MAP:
            normalized[SUMMARY_MAP[key]] = value
        else:
            normalized[key] = value

    if "Petrol Pump Name" not in normalized and "pump_name" in parsed:
        normalized["Petrol Pump Name"] = parsed["pump_name"]
    if "Date" not in normalized and parsed.get("bill_date"):
        normalized["Date"] = parsed["bill_date"]
    if "Total Amount (Rs)" not in normalized and parsed.get("total_amount") is not None:
        normalized["Total Amount (Rs)"] = parsed["total_amount"]
    if "Product" not in normalized:
        normalized["Product"] = (
            parsed.get("product")
            or parsed.get("fuel_type")
            or parsed.get("product_name")
            or "Fuel"
        )

    return normalized

def lambda_handler(event, context):
    try:
        params = event.get('queryStringParameters') or {}
        file_key = params.get('key')
        if not file_key:
            return _response(400, {"error": "Missing key parameter"})

        # Handle URL-encoded keys from the browser
        decoded_key = unquote_plus(file_key)

        item = DDB.get_item(
            TableName=TABLE,
            Key={"file_key": {"S": decoded_key}}
        ).get('Item')

        if not item:
            # Not written yet; let client continue polling
            return _response(404, {"error": "Not found"})

        data = {
            "file_key": item['file_key']['S'],
            "created_at": item.get('created_at', {}).get('S'),
            "job_status": item.get('job_status', {}).get('S'),
            "error": item.get('error', {}).get('S'),
        }

        parsed_payload = {}
        if 'data' in item:
            stored = item['data']['S']
            try:
                raw = json.loads(stored)
            except json.JSONDecodeError:
                raw = {"raw_text": stored}

            if isinstance(raw, dict) and "raw_text" in raw:
                parsed_payload = _parse_raw_block(raw.get("raw_text", ""))
            else:
                parsed_payload = raw

            data["raw"] = raw
            data["data"] = _normalize_data(parsed_payload)

        return _response(200, {"ok": True, "item": data})
    except Exception as e:
        return _response(500, {"error": str(e)})



