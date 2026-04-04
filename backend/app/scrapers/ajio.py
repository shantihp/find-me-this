import httpx
from app.scrapers.base import BaseScraper
from app.models.product import Product

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://www.ajio.com/",
}

class AjioScraper(BaseScraper):
    platform = "ajio"

    async def search(self, query: str, category: str) -> list[Product]:
        # Ajio exposes a search JSON endpoint used by their SPA
        url = "https://www.ajio.com/api/search"
        params = {
            "fields": "SITE",
            "currentPage": 0,
            "pageSize": 20,
            "format": "json",
            "query": f"{query}:relevance",
            "sortBy": "relevance",
        }
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(url, params=params, headers=HEADERS)
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return []

        products = []
        for item in (data.get("products") or [])[:10]:
            try:
                price = self._safe_price(item.get("price", {}).get("value", 0))
                mrp   = self._safe_price(item.get("wasPriceData", {}).get("value", 0)) or price
                code  = item.get("code", "")
                img_list = item.get("images") or []
                img_url = img_list[0].get("url") if img_list else None

                products.append(Product(
                    platform="ajio",
                    product_name=item.get("fnlColorVariantData", {}).get("webProductName") or item.get("name", ""),
                    price=price,
                    original_price=mrp,
                    discount_percent=self._discount(price, mrp),
                    image_url=f"https://assets.ajio.com{img_url}" if img_url else None,
                    product_url=f"https://www.ajio.com/p/{code}" if code else "https://www.ajio.com",
                    in_stock=item.get("stock", {}).get("stockLevelStatus") != "outOfStock",
                ))
            except Exception:
                continue
        return products
