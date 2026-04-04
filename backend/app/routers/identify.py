from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services.vision import identify_product

router = APIRouter()

class IdentifyRequest(BaseModel):
    image: str  # base64-encoded image bytes

@router.post("/identify")
async def identify(req: IdentifyRequest):
    if not req.image:
        raise HTTPException(400, "image is required")
    try:
        result = await identify_product(req.image)
        return result
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        msg = str(e)
        if "429" in msg or "rate limit" in msg.lower():
            raise HTTPException(429, "Vision service is busy — please try again in a moment.")
        raise HTTPException(500, f"Vision service error: {msg}")
