import os
import json
import base64
import google.generativeai as genai

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
_model = genai.GenerativeModel("gemini-1.5-flash")

PROMPT = """You are a product identification assistant for an Indian fashion and beauty shopping app.
Analyze the image and return ONLY a JSON object with these fields:
- category: one of ["fashion", "beauty", "footwear", "accessories", "unknown"]
- sub_type: specific item (e.g. "anarkali kurta", "midi dress", "kajal", "block heel sandals")
- attributes: comma-separated visual attributes (color, pattern, style, material if visible)
- search_query: the best search string to find this on Indian shopping sites like Myntra, Nykaa, Amazon India

Return only valid JSON, no markdown, no extra text."""

async def identify_product(image_b64: str) -> dict:
    image_bytes = base64.b64decode(image_b64)
    response = await _model.generate_content_async([
        {"mime_type": "image/jpeg", "data": image_bytes},
        PROMPT,
    ])
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
