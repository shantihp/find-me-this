import os
import re
import httpx
from app.scrapers.base import BaseScraper
from app.models.product import Product

_API_KEY = os.getenv("SERPAPI_KEY")
_URL = "https://serpapi.com/search"

# Map SerpAPI source names to our platform slugs
PLATFORM_MAP = {
    "myntra": "myntra",
    "amazon": "amazon",
    "flipkart": "flipkart",
    "ajio": "ajio",
    "nykaa": "nykaa",
    "meesho": "meesho",
}

# Whitelist of Indian e-commerce domains — results from other domains are discarded
INDIAN_ECOM_DOMAINS = {
    "myntra.com", "amazon.in", "flipkart.com", "ajio.com",
    "nykaa.com", "meesho.com", "nykaafashion.com", "snapdeal.com",
    "tatacliq.com", "jiomart.com", "reliancedigital.in", "firstcry.com",
    "limeroad.com", "shopclues.com", "pepperfry.com", "craftsvilla.com",
}

def _detect_platform(source: str, link: str) -> str | None:
    """Return platform slug, or None if the site is not a known Indian e-com domain."""
    s = (source + link).lower()
    for key in PLATFORM_MAP:
        if key in s:
            return PLATFORM_MAP[key]
    # Only include results from whitelisted Indian e-commerce sites
    if any(domain in s for domain in INDIAN_ECOM_DOMAINS):
        return source.lower().split(".")[0] if source else "other"
    return None

def _parse_price(raw: str) -> float:
    """Extract numeric price from strings like '₹1,299', 'INR 999', etc."""
    cleaned = re.sub(r"[^\d.]", "", str(raw))
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


class SerpApiScraper(BaseScraper):
    """
    Searches Google Shopping (India) via SerpAPI.
    Returns results from all platforms in one call — replaces the
    platform-specific scrapers that get blocked from cloud IPs.
    """
    platform = "serpapi"

    async def search(self, query: str, category: str) -> list[Product]:
        if not _API_KEY:
            print("SERPAPI key not set")
            return []

        params = {
            "engine": "google_shopping",
            "q": query,
            "gl": "in",        # India
            "hl": "en",
            "num": 40,
            "api_key": _API_KEY,
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            print(f"SERPAPI error: {e}")
            return []

        products = []
        for item in data.get("shopping_results", []):
            try:
                price = _parse_price(item.get("price", "0"))
                if price <= 0:
                    continue

                source  = item.get("source", "")
                link    = item.get("link", "") or item.get("product_link", "")
                platform = _detect_platform(source, link)

                if platform is None:
                    continue  # Non-Indian site — skip

                products.append(Product(
                    platform=platform,
                    product_name=item.get("title", ""),
                    price=price,
                    original_price=price,
                    discount_percent=0,
                    image_url=item.get("thumbnail"),
                    product_url=link or f"https://www.google.com/search?q={query}",
                    rating=float(item["rating"]) if item.get("rating") else None,
                    in_stock=True,
                    source="serpapi",
                ))
            except Exception:
                continue

        print(f"SERPAPI returned {len(products)} results")
        return products
