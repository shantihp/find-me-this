import os
import boto3
from datetime import date, datetime, timezone
from botocore.exceptions import ClientError

TABLE = os.getenv("RATE_LIMIT_TABLE", "FindMeThis-RateLimits")
DAILY_LIMIT = 10

_dynamo = None

def _client():
    global _dynamo
    if _dynamo is None:
        _dynamo = boto3.client("dynamodb", region_name=os.getenv("AWS_REGION", "ap-south-1"))
    return _dynamo

def get_status(ip: str) -> dict:
    """Returns current count without incrementing. Used for status checks."""
    today = date.today().isoformat()
    pk = f"IP#{ip}"
    sk = f"DATE#{today}"

    try:
        resp = _client().get_item(
            TableName=TABLE,
            Key={"pk": {"S": pk}, "sk": {"S": sk}},
        )
        count = int(resp.get("Item", {}).get("count", {}).get("N", 0))
        remaining = max(0, DAILY_LIMIT - count)
        return {"count": count, "limit": DAILY_LIMIT, "remaining": remaining, "allowed": remaining > 0}
    except ClientError:
        return {"count": 0, "limit": DAILY_LIMIT, "remaining": DAILY_LIMIT, "allowed": True}


def check_and_increment(ip: str, user_id: str | None) -> dict:
    """Returns {'allowed': bool, 'count': int, 'limit': int, 'authenticated': bool}"""
    if user_id:
        return {"allowed": True, "count": 0, "limit": DAILY_LIMIT, "authenticated": True}

    today = date.today().isoformat()
    pk = f"IP#{ip}"
    sk = f"DATE#{today}"

    # TTL = end of today UTC
    now = datetime.now(timezone.utc)
    ttl = int(now.replace(hour=23, minute=59, second=59).timestamp())

    try:
        resp = _client().update_item(
            TableName=TABLE,
            Key={"pk": {"S": pk}, "sk": {"S": sk}},
            UpdateExpression="ADD #c :one SET #ttl = if_not_exists(#ttl, :ttl)",
            ConditionExpression="attribute_not_exists(#c) OR #c < :limit",
            ExpressionAttributeNames={"#c": "count", "#ttl": "ttl"},
            ExpressionAttributeValues={
                ":one":   {"N": "1"},
                ":ttl":   {"N": str(ttl)},
                ":limit": {"N": str(DAILY_LIMIT)},
            },
            ReturnValues="ALL_NEW",
        )
        count = int(resp["Attributes"]["count"]["N"])
        return {"allowed": True, "count": count, "limit": DAILY_LIMIT, "authenticated": False}

    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return {"allowed": False, "count": DAILY_LIMIT, "limit": DAILY_LIMIT, "authenticated": False}
        # DynamoDB unavailable — fail open (allow the search)
        return {"allowed": True, "count": 0, "limit": DAILY_LIMIT, "authenticated": False}
