import re
import httpx
from app.scrapers.base import BaseScraper
from app.models.product import Product

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}

def _unescape(s: str) -> str:
    """Decode \u002F-style unicode escapes in Myntra's embedded JSON."""
    try:
        return s.encode().decode("unicode_escape")
    except Exception:
        return s.replace(r"\u002F", "/")

class MyntraScraper(BaseScraper):
    platform = "myntra"

    async def search(self, query: str, category: str) -> list[Product]:
        # Myntra's internal gateway API requires auth — scrape the search page instead.
        slug = query.replace(" ", "-").lower()
        url = f"https://www.myntra.com/{slug}"
        try:
            async with httpx.AsyncClient(timeout=12, follow_redirects=True) as client:
                # Warm up cookies with homepage first
                await client.get("https://www.myntra.com/", headers=HEADERS)
                resp = await client.get(url, headers=HEADERS)
                print(f"MYNTRA status={resp.status_code} len={len(resp.text)}")
                resp.raise_for_status()
                html = resp.text
        except Exception as e:
            print(f"MYNTRA fetch error: {e}")
            return []

        # Products are embedded as JavaScript in window.__myx.
        # Split on landingPageUrl to get one block per product.
        blocks = re.split(r'\{"landingPageUrl":', html)[1:11]
        print(f"MYNTRA blocks found: {len(blocks)}")
        products = []
        for block in blocks:
            try:
                landing = re.search(r'^"([^"]+)"', block)
                name    = re.search(r'"productName":"([^"]+)"', block)
                price   = re.search(r'"price":(\d+)', block)
                mrp     = re.search(r'"mrp":(\d+)', block)
                img     = re.search(r'"searchImage":"([^"]+)"', block)
                pid     = re.search(r'"productId":(\d+)', block)
                rating  = re.search(r'"rating":([\d.]+)', block)

                if not name or not price:
                    continue

                price_val = self._safe_price(price.group(1))
                mrp_val   = self._safe_price(mrp.group(1)) if mrp else price_val
                img_url   = _unescape(img.group(1)) if img else None
                slug_url  = _unescape(landing.group(1)) if landing else ""
                pid_val   = pid.group(1) if pid else ""

                products.append(Product(
                    platform="myntra",
                    product_name=name.group(1),
                    price=price_val,
                    original_price=mrp_val,
                    discount_percent=self._discount(price_val, mrp_val),
                    image_url=img_url,
                    product_url=f"https://www.myntra.com/{slug_url}" if slug_url else f"https://www.myntra.com/{pid_val}/buy",
                    rating=float(rating.group(1)) if rating else None,
                    in_stock=True,
                ))
            except Exception:
                continue
        return products
