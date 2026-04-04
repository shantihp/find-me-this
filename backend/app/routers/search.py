from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services.rate_limit import check_and_increment
from app.services.aggregator import run_search
from app.auth import get_user_id

router = APIRouter()

class SearchRequest(BaseModel):
    search_query: str
    category: str = "unknown"

@router.post("/search")
async def search(req: SearchRequest, request: Request):
    user_id = get_user_id(request)
    ip = request.client.host

    rate = check_and_increment(ip, user_id)
    if not rate["allowed"]:
        raise HTTPException(
            status_code=429,
            detail={
                "message": "Daily search limit reached",
                "limit": rate["limit"],
                "authenticated": rate["authenticated"],
            }
        )

    products = await run_search(req.search_query, req.category)
    return products
