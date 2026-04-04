import os
import re
import json
import asyncio
import httpx

_API_KEY = os.getenv("GEMINI_API_KEY")
_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

PROMPT = """You are a product identification assistant for an Indian fashion and beauty shopping app.
Analyze the image and return ONLY a JSON object with these fields:
- category: one of ["fashion", "beauty", "footwear", "accessories", "unknown"]
- sub_type: specific item (e.g. "anarkali kurta", "midi dress", "kajal", "block heel sandals")
- attributes: comma-separated visual attributes (color, pattern, style, material if visible)
- search_query: the best search string to find this on Indian shopping sites like Myntra, Nykaa, Amazon India

Return only valid JSON, no markdown, no extra text."""

async def identify_product(image_b64: str) -> dict:
    payload = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": image_b64}},
                {"text": PROMPT},
            ]
        }],
        "generationConfig": {"temperature": 0, "maxOutputTokens": 1024},
    }

    last_err = None
    for attempt in range(3):
        if attempt > 0:
            await asyncio.sleep(2 ** attempt)  # 2s, 4s
        try:
            async with httpx.AsyncClient(timeout=25) as client:
                resp = await client.post(_URL, params={"key": _API_KEY}, json=payload)
                if resp.status_code == 429:
                    last_err = Exception("Gemini rate limit hit — please try again in a moment.")
                    continue
                resp.raise_for_status()
                break
        except httpx.HTTPStatusError as e:
            last_err = e
            if e.response.status_code != 429:
                raise
    else:
        raise last_err

    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()

    # Strip markdown code fences (``` or ```json ... ```)
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"```\s*$", "", text).strip()

    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Fall back to extracting the first {...} block from the response
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"Could not parse model response as JSON: {text[:200]}")
