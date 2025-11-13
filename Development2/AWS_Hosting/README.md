## Fuel Bill Extraction on AWS: S3 -> Lambda -> Gemini -> DynamoDB -> Excel to S3

This guide sets up a serverless workflow where uploading a fuel bill (PDF/JPG/PNG) to S3 triggers a Lambda function that:
- Downloads the file
- Extracts fields using Google Gemini
- Saves the extracted JSON to DynamoDB (`FuelBillJobs`)
- Generates an Excel workbook (openpyxl) and uploads it to S3 (`output/{...}.xlsx`)

No Node backend is required. Your existing FastAPI code can remain for other features, but this workflow runs fully serverless on AWS.


### Architecture
- S3 Bucket (input): `my-fuelbills-uploads` with prefix `uploads/` for user uploads
- Lambda (Python 3.11): Triggered on S3 ObjectCreated events for `uploads/*`
- Google Gemini API: Used by Lambda to extract fields (Pump Name, Bill Number, etc.)
- DynamoDB: Table `FuelBillJobs`, stores extracted JSON per file
- S3 Bucket (output): Same or separate bucket for Excel files: `output/{originalBaseName}.xlsx`


## Prerequisites
- AWS Account with admin access for setup
- Python 3.11 locally
- Docker (recommended) for building Lambda dependencies cleanly
- Google API Key with access to Gemini models


## Resource Naming (you can change names)
- Input Bucket: `my-fuelbills-uploads`
  - Input prefix: `uploads/`
- Output prefix in same bucket: `output/` (or use a second bucket if preferred)
- DynamoDB Table: `FuelBillJobs`
  - Partition key: `file_key` (String) — e.g., `uploads/abc123.pdf`
  - Optional attributes: `created_at` (Number or String ISO), `job_status`, `error`, `data` (Map)


## Step 1: Create S3 Bucket(s)
1) Create bucket `my-fuelbills-uploads` (Region of your choice).
2) Enable default encryption (SSE-S3 is fine).
3) Keep public access blocked.
4) Folder structure (logical only):
   - Upload files to `uploads/`
   - Lambda will place Excel files under `output/`


## Step 2: Create DynamoDB Table
1) Create table: `FuelBillJobs`
2) Primary key:
   - Partition key: `file_key` (String)
3) On-demand capacity is fine to start.


## Step 3: Create IAM Role for Lambda
Create an execution role (e.g., `FuelBillLambdaRole`) with:

Trust policy (allow Lambda to assume the role):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Attach policies:
- AWS managed: `AWSLambdaBasicExecutionRole` (CloudWatch logs)
- Inline policy (adjust bucket/table names as needed):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Access",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-fuelbills-uploads",
        "arn:aws:s3:::my-fuelbills-uploads/*"
      ]
    },
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/FuelBillJobs"
    }
  ]
}
```

If you store the Gemini API key in AWS Secrets Manager, add permissions to `secretsmanager:GetSecretValue`. If you prefer environment variables, you don’t need Secrets Manager permissions.


## Step 4: Prepare Lambda Function (Python 3.11)
We’ll package dependencies with Docker to ensure Lambda-compatible wheels (especially for `pdfplumber` and `Pillow`).

Directory structure (example):
```
lambda/
  handler.py
  requirements.txt
  Dockerfile.build  (optional build helper)
```

Example `requirements.txt`:
```
boto3
google-generativeai
openpyxl
pdfplumber
Pillow
python-dateutil
```

Example `handler.py` (minimal functional example; adapt fields as needed):
```python
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

genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel(GEMINI_MODEL)

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
    prompt = (
        "Extract structured fields from the fuel bill image(s): "
        "pump_name, bill_number, bill_date, liters, price_per_liter, total_amount. "
        "Return a JSON object with these keys."
    )
    # Gemini accepts image parts; convert PIL to bytes
    parts = [{"text": prompt}]
    for img in images:
        buf = io.BytesIO()
        img.convert("RGB").save(buf, format="JPEG", quality=90)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": b64}})

    resp = model.generate_content(parts)
    # Try to parse JSON from response
    try:
        text = resp.text.strip()
        data = json.loads(text)
    except Exception:
        data = {"raw_text": resp.text}
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
    # S3 Trigger event
    # For each record, process the uploaded file
    for record in event.get('Records', []):
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        if not key.startswith('uploads/'):
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
            excel_bytes = _write_excel_row(data)
            base_name = key.split('/')[-1].rsplit('.', 1)[0]
            out_key = f\"{OUTPUT_PREFIX}{base_name}.xlsx\"

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
```


## Step 5: Build and Package Lambda
Two common options:

Option A) Use AWS SAM/Serverless Framework (recommended for repeatable infra).  
Option B) Manual zip with Docker build.

### Option A: Deploy with AWS SAM (one-command infra)
Files provided in `AWS_Hosting/`:
- `template.yaml` (SAM template for S3, DynamoDB, Lambda, trigger)
- `lambda/handler.py` (Lambda code)
- `lambda/requirements.txt` (Lambda dependencies)

Build and deploy:
```bash
cd AWS_Hosting
sam build
sam deploy --guided \
  --stack-name fuel-bill-extraction \
  --parameter-overrides \
    InputBucketName=my-fuelbills-uploads \
    DynamoTableName=FuelBillJobs \
    OutputPrefix=output/ \
    UploadsPrefix=uploads/ \
    GeminiModel=gemini-2.5-flash
```
During the first guided deploy, SAM will ask for defaults; answer yes to save a `samconfig.toml` for future one-command deploys.

After deployment:
- Go to Lambda console → the function `fuelbill-extract`
- Add environment variable `GOOGLE_API_KEY` (or wire Secrets Manager)
- Save, then test by uploading to `s3://my-fuelbills-uploads/uploads/...`

Update cycle:
```bash
sam build && sam deploy
```

Manual (quick path):
1) From `lambda/`, build wheels in manylinux container:
   ```bash
   docker run --rm -v "$PWD":/var/task -w /var/task public.ecr.aws/lambda/python:3.11 \
     /bin/bash -lc "pip install -r requirements.txt -t ./package && exit"
   ```
2) Create deployment zip:
   ```bash
   cd package
   zip -r ../function.zip .
   cd ..
   zip -g function.zip handler.py
   ```

Note: If `pdfplumber`/`Pillow` wheels fail, switch to a container-based Lambda (Lambda container image) or use SAM/Serverless to build inside an Amazon Linux-compatible environment.


## Step 6: Create the Lambda Function
1) In AWS Lambda console → Create function:
   - Author from scratch
   - Name: `fuelbill-extract`
   - Runtime: Python 3.11
   - Architecture: arm64 or x86_64 (arm64 is cheaper)
   - Role: choose `FuelBillLambdaRole`
2) Upload `function.zip` as code.
3) Set Environment variables:
   - `GOOGLE_API_KEY` = your key
   - `DDB_TABLE` = `FuelBillJobs`
   - `OUTPUT_PREFIX` = `output/`
   - `GEMINI_MODEL` = `gemini-2.5-flash` (or your preferred model)
4) Basic settings:
   - Memory: 1024 MB (increase if PDFs are large)
   - Timeout: 60–120 seconds (adjust for larger workloads)


## Step 7: Add S3 Trigger
1) In the Lambda’s Triggers tab → Add trigger
2) Source: S3
3) Bucket: `my-fuelbills-uploads`
4) Event type: `PUT` (All object create events)
5) Prefix: `uploads/`
6) Suffix (optional): `.pdf` (add more triggers for `.jpg`, `.jpeg`, `.png`) or leave empty to handle all
7) Acknowledge notification permissions → Add


## Step 8: Test the Workflow
1) Upload a sample PDF/JPG/PNG to `s3://my-fuelbills-uploads/uploads/yourfile.pdf`
2) Watch Lambda logs in CloudWatch for success/errors
3) Check DynamoDB `FuelBillJobs` for an item where `file_key` equals `uploads/yourfile.pdf`
4) Check S3 `output/yourfile.xlsx` is created

Commands For testing:
1. S3: Upload a test file to S3 (replace BUCKET with your actual bucket)
- PDF:
aws s3 cp ~/Downloads/test.pdf s3://BUCKET/uploads/test.pdf --region ap-south-1
- Image:
aws s3 cp ~/Downloads/test.jpg s3://BUCKET/uploads/test.jpg --region ap-south-1

2. Watch Lambda logs
- Console: CloudWatch → Logs → Log groups → /aws/lambda/fuelbill-extract → open latest stream
- CLI:
aws logs tail /aws/lambda/fuelbill-extract --follow --region ap-south-1

3. Verify DynamoDB item
- aws dynamodb get-item --table-name FuelBillJobs --key '{"file_key":{"S":"uploads/test.pdf"}}' --region ap-south-1
- For image: change key to uploads/test.jpg

4. Verify Excel output in S3
aws s3 ls s3://BUCKET/output/ --region ap-south-1
aws s3 cp s3://BUCKET/output/test.xlsx ./ --region ap-south-1


## Step 9: Frontend Integration (optional)
If your frontend needs to list results:
- Read from DynamoDB via a small API (API Gateway + Lambda) or directly by known keys
- Or list `output/` objects from S3 to display download links


## Security and Production Notes
- Store `GOOGLE_API_KEY` in AWS Secrets Manager and read it at startup (add `secretsmanager:GetSecretValue` to the role).
- Restrict S3 bucket policies to your account; keep public access blocked.
- Add error handling and retries for Gemini API calls; consider exponential backoff.
- For larger files, increase Lambda memory/timeouts and consider splitting PDF pages.
- Cost controls: prefer on-demand DynamoDB, enable S3 lifecycle rules for old files, monitor Lambda concurrency.


## Cleanup
1) Remove S3 buckets (or empty them, then delete)
2) Delete the DynamoDB table `FuelBillJobs`
3) Delete the Lambda function and role
4) Remove CloudWatch log groups if desired


## Troubleshooting
- Missing libraries in Lambda: build dependencies in an Amazon Linux env or use a container image for Lambda.
- Timeouts on large PDFs: increase timeout/memory; pre-convert pages to images.
- Unparseable Gemini response: log `resp.text` and add robust JSON detection/parsing.
- Permission denied errors: check IAM role policy resources (bucket ARN, table ARN).


