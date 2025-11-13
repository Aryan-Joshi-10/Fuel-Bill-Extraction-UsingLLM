import os
import json
import boto3

S3 = boto3.client('s3')
BUCKET_NAME = os.getenv('BUCKET_NAME')
OUTPUT_PREFIX = os.getenv('OUTPUT_PREFIX', 'output/')

def _response(status, body):
    return {
        "statusCode": status,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(body)
    }

def lambda_handler(event, context):
    try:
        params = event.get('queryStringParameters') or {}
        # Expect either output_key or file_key
        output_key = params.get('output_key')
        file_key = params.get('file_key')

        if not output_key and not file_key:
            return _response(400, {"error": "Missing output_key or file_key"})

        if not output_key and file_key:
            base = file_key.split('/')[-1].rsplit('.', 1)[0]
            output_key = f"{OUTPUT_PREFIX}{base}.xlsx"

        url = S3.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': output_key},
            ExpiresIn=600
        )
        return _response(200, {"url": url, "key": output_key})
    except Exception as e:
        return _response(500, {"error": str(e)})


