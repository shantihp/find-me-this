import os
import json
from openai import AsyncOpenAI

_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are a product identification assistant for an Indian fashion and beauty shopping app.
Analyze the image and return ONLY a JSON object with these fields:
- category: one of ["fashion", "beauty", "footwear", "accessories", "unknown"]
- sub_type: specific item (e.g. "anarkali kurta", "midi dress", "kajal", "block heel sandals")
- attributes: comma-separated visual attributes (color, pattern, style, material if visible)
- search_query: the best search string to find this on Indian shopping sites like Myntra, Nykaa, Amazon India

Return only valid JSON, no markdown, no extra text."""

async def identify_product(image_b64: str) -> dict:
    response = await _client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{image_b64}", "detail": "low"},
                },
                {"type": "text", "text": SYSTEM_PROMPT},
            ],
        }],
        max_tokens=250,
        temperature=0,
    )
    text = response.choices[0].message.content.strip()
    # Strip markdown code fences if model wraps in ```json
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text)
