import os
import json
import boto3

DDB = boto3.client('dynamodb')
TABLE = os.getenv('DDB_TABLE')

def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body)
    }

def _parse_amount_from_data(data_str):
    """Extract total amount from DynamoDB data field"""
    try:
        data = json.loads(data_str)
        if not isinstance(data, dict):
            return 0
        
        # Handle raw_text format (Gemini response)
        if 'raw_text' in data:
            raw = data['raw_text']
            # Try to extract JSON from markdown code blocks
            if '```json' in raw or '```' in raw or '{' in raw:
                json_start = raw.find('{')
                json_end = raw.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    try:
                        parsed = json.loads(raw[json_start:json_end])
                        amount = float(
                            parsed.get('total_amount', 0) or 
                            parsed.get('Total Amount (Rs)', 0) or 
                            0
                        )
                        return amount
                    except:
                        pass
            return 0
        
        # Direct data structure
        amount = float(
            data.get('total_amount', 0) or 
            data.get('Total Amount (Rs)', 0) or 
            data.get('total', 0) or 
            0
        )
        return amount
    except Exception:
        return 0

def lambda_handler(event, context):
    try:
        # Scan DynamoDB for all completed fuel bills
        total = 0.0
        count = 0
        
        response = DDB.scan(
            TableName=TABLE,
            FilterExpression='job_status = :status',
            ExpressionAttributeValues={':status': {'S': 'COMPLETED'}}
        )
        
        for item in response.get('Items', []):
            if 'data' in item:
                amount = _parse_amount_from_data(item['data']['S'])
                if amount > 0:
                    total += amount
                    count += 1
        
        # Handle pagination if there are more items
        while 'LastEvaluatedKey' in response:
            response = DDB.scan(
                TableName=TABLE,
                FilterExpression='job_status = :status',
                ExpressionAttributeValues={':status': {'S': 'COMPLETED'}},
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            for item in response.get('Items', []):
                if 'data' in item:
                    amount = _parse_amount_from_data(item['data']['S'])
                    if amount > 0:
                        total += amount
                        count += 1
        
        return _response(200, {
            "ok": True,
            "total": round(total, 2),
            "count": count
        })
    except Exception as e:
        return _response(500, {"error": str(e)})

