import os
import uuid
import time
import base64
import boto3
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.auth import get_user_id

router = APIRouter()
TABLE  = os.getenv("USER_DATA_TABLE", "FindMeThis-UserData")
BUCKET = os.getenv("SAMPLES_BUCKET", "findmethis-samples")
REGION = os.getenv("AWS_REGION", "ap-south-1")
TTL_DAYS = 5

def _dynamo():
    return boto3.client("dynamodb", region_name=REGION)

def _s3():
    return boto3.client("s3", region_name=REGION)


class UploadRequest(BaseModel):
    image: str                    # base64-encoded image data
    file_name: str = "photo.jpg"
    mime_type: str = "image/jpeg"


@router.post("/samples")
async def upload_sample(req: UploadRequest, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    sample_id = str(uuid.uuid4())
    now = int(time.time())
    ttl = now + TTL_DAYS * 86400
    s3_key = f"samples/{user_id}/{sample_id}"

    try:
        image_data = base64.b64decode(req.image)
    except Exception:
        raise HTTPException(422, "Invalid base64 image data")

    _s3().put_object(
        Bucket=BUCKET,
        Key=s3_key,
        Body=image_data,
        ContentType=req.mime_type,
    )

    ddb = _dynamo()
    # User-scoped record (for listing the user's own samples)
    ddb.put_item(
        TableName=TABLE,
        Item={
            "pk":          {"S": f"USER#{user_id}"},
            "sk":          {"S": f"SAMPLE#{now}#{sample_id}"},
            "type":        {"S": "sample"},
            "sample_id":   {"S": sample_id},
            "user_id":     {"S": user_id},
            "s3_key":      {"S": s3_key},
            "file_name":   {"S": req.file_name},
            "uploaded_at": {"N": str(now)},
            "ttl":         {"N": str(ttl)},
        }
    )
    # Sample-scoped record (for public lookup by sample_id only)
    ddb.put_item(
        TableName=TABLE,
        Item={
            "pk":          {"S": f"SAMPLE#{sample_id}"},
            "sk":          {"S": "META"},
            "type":        {"S": "sample_meta"},
            "sample_id":   {"S": sample_id},
            "user_id":     {"S": user_id},
            "s3_key":      {"S": s3_key},
            "file_name":   {"S": req.file_name},
            "uploaded_at": {"N": str(now)},
            "ttl":         {"N": str(ttl)},
        }
    )

    return {"sample_id": sample_id, "expires_at": ttl}


@router.get("/samples")
async def list_samples(request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    resp = _dynamo().query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "SAMPLE#"},
        },
        ScanIndexForward=False,
    )

    s3 = _s3()
    items = []
    for item in resp.get("Items", []):
        try:
            view_url = s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": BUCKET, "Key": item["s3_key"]["S"]},
                ExpiresIn=3600,
            )
        except Exception:
            view_url = None
        items.append({
            "sample_id":   item["sample_id"]["S"],
            "file_name":   item["file_name"]["S"],
            "uploaded_at": int(item["uploaded_at"]["N"]),
            "expires_at":  int(item["ttl"]["N"]),
            "view_url":    view_url,
        })
    return items


@router.get("/samples/view/{sample_id}")
async def view_sample(sample_id: str):
    """Public endpoint — no auth required."""
    resp = _dynamo().get_item(
        TableName=TABLE,
        Key={"pk": {"S": f"SAMPLE#{sample_id}"}, "sk": {"S": "META"}}
    )
    item = resp.get("Item")
    if not item:
        raise HTTPException(404, "Sample not found or expired")

    # Enforce TTL eagerly (DynamoDB TTL deletion can lag up to 48 h)
    if int(item["ttl"]["N"]) < int(time.time()):
        raise HTTPException(404, "Sample not found or expired")

    try:
        view_url = _s3().generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": item["s3_key"]["S"]},
            ExpiresIn=3600,
        )
    except Exception:
        raise HTTPException(500, "Could not generate view URL")

    return {
        "sample_id":   sample_id,
        "file_name":   item["file_name"]["S"],
        "uploaded_at": int(item["uploaded_at"]["N"]),
        "expires_at":  int(item["ttl"]["N"]),
        "view_url":    view_url,
    }


@router.delete("/samples/{sample_id}")
async def delete_sample(sample_id: str, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")

    ddb = _dynamo()
    resp = ddb.query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        FilterExpression="sample_id = :sid",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "SAMPLE#"},
            ":sid":    {"S": sample_id},
        }
    )
    items = resp.get("Items", [])
    if not items:
        raise HTTPException(404, "Sample not found")

    s3_key = items[0]["s3_key"]["S"]

    try:
        _s3().delete_object(Bucket=BUCKET, Key=s3_key)
    except Exception:
        pass  # best-effort

    for item in items:
        ddb.delete_item(
            TableName=TABLE,
            Key={"pk": item["pk"], "sk": item["sk"]}
        )
    ddb.delete_item(
        TableName=TABLE,
        Key={"pk": {"S": f"SAMPLE#{sample_id}"}, "sk": {"S": "META"}}
    )

    return {"deleted": True}
