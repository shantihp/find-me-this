import os
import time
import boto3
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.auth import get_user_id

router = APIRouter()
TABLE = os.getenv("USER_DATA_TABLE", "FindMeThis-UserData")
HISTORY_TTL_DAYS = 90

def _dynamo():
    return boto3.client("dynamodb", region_name=os.getenv("AWS_REGION", "ap-south-1"))

class HistoryRequest(BaseModel):
    detected_query: str
    category: str
    result_count: int

@router.post("/history")
async def add_history(req: HistoryRequest, request: Request):
    user_id = get_user_id(request)
    if not user_id:
        return {"ok": True}  # silently skip for guests
    ts = int(time.time())
    ttl = ts + HISTORY_TTL_DAYS * 86400
    _dynamo().put_item(
        TableName=TABLE,
        Item={
            "pk":             {"S": f"USER#{user_id}"},
            "sk":             {"S": f"HIST#{ts}"},
            "type":           {"S": "history"},
            "detected_query": {"S": req.detected_query},
            "category":       {"S": req.category},
            "result_count":   {"N": str(req.result_count)},
            "searched_at":    {"N": str(ts)},
            "ttl":            {"N": str(ttl)},
        }
    )
    return {"ok": True}

@router.get("/history")
async def get_history(request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    resp = _dynamo().query(
        TableName=TABLE,
        KeyConditionExpression="pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues={
            ":pk":     {"S": f"USER#{user_id}"},
            ":prefix": {"S": "HIST#"},
        },
        ScanIndexForward=False,   # newest first
        Limit=100,
    )
    items = []
    for item in resp.get("Items", []):
        items.append({
            "detected_query": item["detected_query"]["S"],
            "category":       item["category"]["S"],
            "result_count":   int(item["result_count"]["N"]),
            "searched_at":    int(item["searched_at"]["N"]),
        })
    return items
