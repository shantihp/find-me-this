import os
import uuid
import time
import boto3
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.auth import get_user_id

router = APIRouter()
TABLE = os.getenv("USER_DATA_TABLE", "FindMeThis-UserData")

def _dynamo():
    return boto3.client("dynamodb", region_name=os.getenv("AWS_REGION", "ap-south-1"))

class BookmarkRequest(BaseModel):
    product_name: str
    platform: str
    price: float
    image_url: str | None = None
    product_url: str

@router.post("/bookmarks")
async def add_bookmark(req: BookmarkRequest, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    bm_id = str(uuid.uuid4())
    _dynamo().put_item(
        TableName=TABLE,
        Item={
            "pk":           {"S": f"USER#{user_id}"},
            "sk":           {"S": f"BM#{int(time.time())}#{bm_id}"},
            "type":         {"S": "bookmark"},
            "bookmark_id":  {"S": bm_id},
            "product_name": {"S": req.product_name},
            "platform":     {"S": req.platform},
            "price":        {"N": str(req.price)},
            "image_url":    {"S": req.image_url or ""},
            "product_url":  {"S": req.product_url},
            "saved_at":     {"N": str(int(time.time()))},
        }
    )
    return {"bookmark_id": bm_id}

@router.get("/bookmarks")
async def get_bookmarks(request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    resp = _dynamo().query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "BM#"},
        }
    )
    items = []
    for item in resp.get("Items", []):
        items.append({
            "bookmark_id":  item["bookmark_id"]["S"],
            "product_name": item["product_name"]["S"],
            "platform":     item["platform"]["S"],
            "price":        float(item["price"]["N"]),
            "image_url":    item["image_url"]["S"] or None,
            "product_url":  item["product_url"]["S"],
        })
    return items

@router.delete("/bookmarks/{bookmark_id}")
async def delete_bookmark(bookmark_id: str, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    # Scan for the SK matching this bookmark_id
    resp = _dynamo().query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        FilterExpression="bookmark_id = :bid",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "BM#"},
            ":bid":    {"S": bookmark_id},
        }
    )
    for item in resp.get("Items", []):
        _dynamo().delete_item(
            TableName=TABLE,
            Key={"pk": item["pk"], "sk": item["sk"]}
        )
    return {"deleted": True}
