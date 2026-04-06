import httpx
from app.scrapers.base import BaseScraper
from app.models.product import Product

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.meesho.com/",
    "origin": "https://www.meesho.com",
}

class MeeshoScraper(BaseScraper):
    platform = "meesho"

    async def search(self, query: str, category: str) -> list[Product]:
        # Meesho blocks cloud IPs with anti-bot protection.
        # Try the GraphQL search endpoint used by their SPA.
        url = "https://www.meesho.com/api/v1/products/search"
        payload = {
            "query": query,
            "page": 1,
            "sortBy": "PRICE_ASC",
            "filters": [],
        }
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.post(url, json=payload, headers=HEADERS)
                if resp.status_code in (403, 429, 503):
                    raise ValueError("blocked")
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return []

        products = []
        for item in (data.get("products") or data.get("data", {}).get("products", []))[:10]:
            try:
                price = self._safe_price(item.get("minPrice") or item.get("price", 0))
                mrp   = self._safe_price(item.get("mrp", 0)) or price
                pid   = item.get("pid") or item.get("id", "")
                imgs  = item.get("images") or []
                img_url = imgs[0].get("url") if imgs else None

                products.append(Product(
                    platform="meesho",
                    product_name=item.get("name", ""),
                    price=price,
                    original_price=mrp,
                    discount_percent=self._discount(price, mrp),
                    image_url=img_url,
                    product_url=f"https://www.meesho.com/product/{pid}" if pid else "https://www.meesho.com",
                    in_stock=True,
                ))
            except Exception:
                continue
        return products
