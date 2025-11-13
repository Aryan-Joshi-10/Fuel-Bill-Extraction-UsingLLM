import os
import json
import uuid
import boto3

S3 = boto3.client('s3')
BUCKET_NAME = os.getenv('BUCKET_NAME')
UPLOADS_PREFIX = os.getenv('UPLOADS_PREFIX', 'uploads/')

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
        body = json.loads(event.get('body') or '{}')
        filename = body.get('filename') or f"file-{uuid.uuid4()}"

        key = f"{UPLOADS_PREFIX}{uuid.uuid4()}-{filename}"

        # Do NOT enforce Content-Type; browsers can vary the multipart content-type
        post = S3.generate_presigned_post(Bucket=BUCKET_NAME, Key=key, ExpiresIn=600)

        return _response(200, {"upload": post, "file_key": key})
    except Exception as e:
        return _response(500, {"error": str(e)})


