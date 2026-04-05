import os
import uuid
import time
import base64
import boto3
from datetime import datetime, timezone
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

def _presign(s3, s3_key):
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": s3_key},
        ExpiresIn=3600,
    )


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
    now       = int(time.time())
    ttl       = now + TTL_DAYS * 86400
    date_str  = datetime.fromtimestamp(now, tz=timezone.utc).strftime("%Y-%m-%d")
    s3_key    = f"samples/{user_id}/{sample_id}"

    try:
        image_data = base64.b64decode(req.image)
    except Exception:
        raise HTTPException(422, "Invalid base64 image data")

    _s3().put_object(
        Bucket=BUCKET, Key=s3_key, Body=image_data, ContentType=req.mime_type,
    )

    ddb = _dynamo()

    # Find or create the folder_id for this (user, date)
    day_rec = ddb.get_item(
        TableName=TABLE,
        Key={"pk": {"S": f"USER#{user_id}"}, "sk": {"S": f"DAY#{date_str}"}},
    ).get("Item")

    if day_rec:
        folder_id = day_rec["folder_id"]["S"]
    else:
        folder_id = str(uuid.uuid4())
        # User-scoped day → folder mapping (for re-use across uploads same day)
        ddb.put_item(TableName=TABLE, Item={
            "pk":        {"S": f"USER#{user_id}"},
            "sk":        {"S": f"DAY#{date_str}"},
            "folder_id": {"S": folder_id},
            "date_str":  {"S": date_str},
            "ttl":       {"N": str(ttl)},
        })
        # Public folder lookup record
        ddb.put_item(TableName=TABLE, Item={
            "pk":       {"S": f"FOLDER#{folder_id}"},
            "sk":       {"S": "META"},
            "user_id":  {"S": user_id},
            "date_str": {"S": date_str},
            "ttl":      {"N": str(ttl)},
        })

    # User-scoped sample record (for listing)
    ddb.put_item(TableName=TABLE, Item={
        "pk":          {"S": f"USER#{user_id}"},
        "sk":          {"S": f"SAMPLE#{now}#{sample_id}"},
        "type":        {"S": "sample"},
        "sample_id":   {"S": sample_id},
        "user_id":     {"S": user_id},
        "s3_key":      {"S": s3_key},
        "file_name":   {"S": req.file_name},
        "folder_id":   {"S": folder_id},
        "date_str":    {"S": date_str},
        "uploaded_at": {"N": str(now)},
        "ttl":         {"N": str(ttl)},
    })
    # Public sample lookup record
    ddb.put_item(TableName=TABLE, Item={
        "pk":          {"S": f"SAMPLE#{sample_id}"},
        "sk":          {"S": "META"},
        "user_id":     {"S": user_id},
        "s3_key":      {"S": s3_key},
        "file_name":   {"S": req.file_name},
        "folder_id":   {"S": folder_id},
        "date_str":    {"S": date_str},
        "uploaded_at": {"N": str(now)},
        "ttl":         {"N": str(ttl)},
    })

    return {"sample_id": sample_id, "folder_id": folder_id, "date_str": date_str, "expires_at": ttl}


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
            view_url = _presign(s3, item["s3_key"]["S"])
        except Exception:
            view_url = None
        items.append({
            "sample_id":   item["sample_id"]["S"],
            "file_name":   item["file_name"]["S"],
            "folder_id":   item.get("folder_id", {}).get("S"),
            "date_str":    item.get("date_str", {}).get("S"),
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
    if int(item["ttl"]["N"]) < int(time.time()):
        raise HTTPException(404, "Sample not found or expired")

    try:
        view_url = _presign(_s3(), item["s3_key"]["S"])
    except Exception:
        raise HTTPException(500, "Could not generate view URL")

    return {
        "sample_id":   sample_id,
        "file_name":   item["file_name"]["S"],
        "folder_id":   item.get("folder_id", {}).get("S"),
        "uploaded_at": int(item["uploaded_at"]["N"]),
        "expires_at":  int(item["ttl"]["N"]),
        "view_url":    view_url,
    }


@router.get("/samples/folder/{folder_id}")
async def view_folder(folder_id: str):
    """Public endpoint — no auth required. Returns all photos for one day."""
    ddb = _dynamo()
    folder = ddb.get_item(
        TableName=TABLE,
        Key={"pk": {"S": f"FOLDER#{folder_id}"}, "sk": {"S": "META"}},
    ).get("Item")

    if not folder:
        raise HTTPException(404, "Folder not found or expired")
    if int(folder["ttl"]["N"]) < int(time.time()):
        raise HTTPException(404, "Folder not found or expired")

    user_id  = folder["user_id"]["S"]
    date_str = folder["date_str"]["S"]

    resp = ddb.query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        FilterExpression="folder_id = :fid",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "SAMPLE#"},
            ":fid":    {"S": folder_id},
        },
        ScanIndexForward=False,
    )

    s3 = _s3()
    photos = []
    for item in resp.get("Items", []):
        try:
            view_url = _presign(s3, item["s3_key"]["S"])
        except Exception:
            continue
        photos.append({
            "sample_id":   item["sample_id"]["S"],
            "file_name":   item["file_name"]["S"],
            "uploaded_at": int(item["uploaded_at"]["N"]),
            "view_url":    view_url,
        })

    return {
        "folder_id":  folder_id,
        "date_str":   date_str,
        "expires_at": int(folder["ttl"]["N"]),
        "photos":     photos,
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

    try:
        _s3().delete_object(Bucket=BUCKET, Key=items[0]["s3_key"]["S"])
    except Exception:
        pass

    for item in items:
        ddb.delete_item(TableName=TABLE, Key={"pk": item["pk"], "sk": item["sk"]})
    ddb.delete_item(
        TableName=TABLE,
        Key={"pk": {"S": f"SAMPLE#{sample_id}"}, "sk": {"S": "META"}}
    )
    return {"deleted": True}
