import os
import re
import json
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services.rate_limit import check_and_increment
from app.services.aggregator import run_search
from app.auth import get_user_id

router = APIRouter()

_API_KEY = os.getenv("GEMINI_API_KEY")
_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

PARSE_PROMPT = """You are a product search assistant for an Indian fashion and beauty shopping app.
The user has described what they are looking for in plain English.
Extract and return ONLY a JSON object with:
- category: one of ["fashion", "beauty", "footwear", "accessories", "unknown"]
- search_query: a concise, effective search string (5-10 words max) to find this on Indian shopping sites like Myntra, Amazon India, Flipkart

Examples:
  Input: "pink dress, shorts, for a thin girl of tall height"
  Output: {"category": "fashion", "search_query": "pink short dress slim fit tall"}

  Input: "red lipstick matte finish long lasting"
  Output: {"category": "beauty", "search_query": "red matte long lasting lipstick"}

  Input: "white sneakers for men under 2000"
  Output: {"category": "footwear", "search_query": "white sneakers men affordable"}

Return only valid JSON, no markdown, no extra text."""


class TextSearchRequest(BaseModel):
    prompt: str


async def parse_prompt(prompt: str) -> dict:
    payload = {
        "contents": [{"parts": [{"text": f"{PARSE_PROMPT}\n\nInput: {prompt}"}]}],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 256},
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(_URL, params={"key": _API_KEY}, json=payload)
        resp.raise_for_status()

    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"```\s*$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        # Fallback: use the prompt directly
        return {"category": "unknown", "search_query": prompt[:100]}


@router.post("/search/text")
async def text_search(req: TextSearchRequest, request: Request):
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

    parsed = await parse_prompt(req.prompt.strip())
    search_query = parsed.get("search_query") or req.prompt[:100]
    category = parsed.get("category", "unknown")

    products = await run_search(search_query, category)
    return {
        "search_query": search_query,
        "category": category,
        "products": products,
    }
