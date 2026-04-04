import httpx
import json
from app.scrapers.base import BaseScraper
from app.models.product import Product

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.myntra.com/",
    "x-location-code": "560001",
}

class MyntraScraper(BaseScraper):
    platform = "myntra"

    async def search(self, query: str, category: str) -> list[Product]:
        url = "https://www.myntra.com/gateway/v2/product/search"
        params = {
            "rawQuery": query,
            "rows": 20,
            "start": 0,
            "plaEnabled": "false",
        }
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url, params=params, headers=HEADERS)
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return []

        products = []
        for item in data.get("products", [])[:10]:
            try:
                price    = self._safe_price(item.get("price", 0))
                mrp      = self._safe_price(item.get("mrp", 0)) or price
                slug     = item.get("landingPageUrl", "")
                products.append(Product(
                    platform="myntra",
                    product_name=item.get("productName", ""),
                    price=price,
                    original_price=mrp,
                    discount_percent=self._discount(price, mrp),
                    image_url=(item.get("imageUrls") or {}).get("1080Xx1440") or item.get("image"),
                    product_url=f"https://www.myntra.com/{slug}" if slug else "https://www.myntra.com",
                    rating=item.get("rating"),
                    in_stock=item.get("inStock", True),
                ))
            except Exception:
                continue
        return products
