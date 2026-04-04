import httpx
from app.scrapers.base import BaseScraper
from app.models.product import Product

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.nykaa.com/",
}

class NykaaScraper(BaseScraper):
    platform = "nykaa"

    async def search(self, query: str, category: str) -> list[Product]:
        url = "https://search.nykaa.com/api/search/v2"
        params = {"q": query, "page": 1, "size": 20, "category": "beauty"}
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url, params=params, headers=HEADERS)
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return []

        products = []
        for item in (data.get("response", {}).get("docs") or data.get("products", []))[:10]:
            try:
                price    = self._safe_price(item.get("discount_price") or item.get("price", 0))
                mrp      = self._safe_price(item.get("mrp") or item.get("original_price", 0)) or price
                slug     = item.get("slug") or item.get("url", "")
                products.append(Product(
                    platform="nykaa",
                    product_name=item.get("name", ""),
                    price=price,
                    original_price=mrp,
                    discount_percent=self._discount(price, mrp),
                    image_url=item.get("image_url") or item.get("imageUrl"),
                    product_url=f"https://www.nykaa.com/p/{slug}" if slug else "https://www.nykaa.com",
                    rating=item.get("average_rating") or item.get("rating"),
                    in_stock=True,
                ))
            except Exception:
                continue
        return products
