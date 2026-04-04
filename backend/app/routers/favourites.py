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

class FavouriteRequest(BaseModel):
    detected_query: str
    category: str

@router.post("/favourites")
async def add_favourite(req: FavouriteRequest, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    fav_id = str(uuid.uuid4())
    _dynamo().put_item(
        TableName=TABLE,
        Item={
            "pk":             {"S": f"USER#{user_id}"},
            "sk":             {"S": f"FAV#{int(time.time())}#{fav_id}"},
            "type":           {"S": "favourite"},
            "fav_id":         {"S": fav_id},
            "detected_query": {"S": req.detected_query},
            "category":       {"S": req.category},
            "saved_at":       {"N": str(int(time.time()))},
        }
    )
    return {"fav_id": fav_id}

@router.get("/favourites")
async def get_favourites(request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    resp = _dynamo().query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "FAV#"},
        }
    )
    items = []
    for item in resp.get("Items", []):
        items.append({
            "fav_id":         item["fav_id"]["S"],
            "detected_query": item["detected_query"]["S"],
            "category":       item["category"]["S"],
            "saved_at":       int(item["saved_at"]["N"]),
        })
    return items

@router.delete("/favourites/{fav_id}")
async def delete_favourite(fav_id: str, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    resp = _dynamo().query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        FilterExpression="fav_id = :fid",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "FAV#"},
            ":fid":    {"S": fav_id},
        }
    )
    for item in resp.get("Items", []):
        _dynamo().delete_item(
            TableName=TABLE,
            Key={"pk": item["pk"], "sk": item["sk"]}
        )
    return {"deleted": True}
