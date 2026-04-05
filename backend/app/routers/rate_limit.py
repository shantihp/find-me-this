from fastapi import APIRouter, Request
from app.services.rate_limit import get_status
from app.auth import get_user_id

router = APIRouter()

@router.get("/rate-limit/status")
def rate_limit_status(request: Request):
    user_id = get_user_id(request)
    if user_id:
        from app.services.rate_limit import DAILY_LIMIT
        return {"count": 0, "limit": DAILY_LIMIT, "remaining": DAILY_LIMIT, "allowed": True, "authenticated": True}
    ip = request.client.host
    status = get_status(ip)
    return {**status, "authenticated": False}
