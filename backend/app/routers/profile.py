from fastapi import APIRouter, HTTPException, Request
from app.auth import get_user_id

router = APIRouter()

@router.get("/profile")
async def get_profile(request: Request):
    user_id = get_user_id(request)
    if not user_id:
        raise HTTPException(401, "Authentication required")
    return {"user_id": user_id, "message": "Profile data — extend with Cognito attributes as needed"}
