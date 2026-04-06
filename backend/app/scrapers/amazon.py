import httpx
import re
from bs4 import BeautifulSoup
from app.scrapers.base import BaseScraper
from app.models.product import Product

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept-Language": "en-IN,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
    "Referer": "https://www.amazon.in/",
}

class AmazonScraper(BaseScraper):
    platform = "amazon"

    async def search(self, query: str, category: str) -> list[Product]:
        url = f"https://www.amazon.in/s"
        params = {"k": query, "ref": "sr_pg_1"}
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers=HEADERS) as client:
                resp = await client.get(url, params=params)
                print(f"AMAZON status={resp.status_code} len={len(resp.text)}")
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            print(f"AMAZON fetch error: {e}")
            return []

        products = []
        cards = soup.select('div[data-component-type="s-search-result"]')[:10]
        print(f"AMAZON cards found: {len(cards)}")
        if not cards:
            # Amazon served a CAPTCHA or bot-check page
            print(f"AMAZON page snippet: {soup.get_text()[:200]}")
        for card in cards:
            try:
                name_el  = card.select_one("h2 span")
                price_el = card.select_one(".a-price .a-offscreen")
                mrp_el   = card.select_one(".a-price.a-text-price .a-offscreen")
                img_el   = card.select_one("img.s-image")
                asin     = card.get("data-asin", "")
                rating_el = card.select_one("i.a-icon-star-small span.a-icon-alt")

                if not name_el or not price_el:
                    continue

                price = self._safe_price(price_el.text)
                mrp   = self._safe_price(mrp_el.text) if mrp_el else price
                rating_text = rating_el.text if rating_el else ""
                rating_match = re.search(r"(\d+\.\d+)", rating_text)

                products.append(Product(
                    platform="amazon",
                    product_name=name_el.text.strip(),
                    price=price,
                    original_price=mrp,
                    discount_percent=self._discount(price, mrp),
                    image_url=img_el["src"] if img_el else None,
                    product_url=f"https://www.amazon.in/dp/{asin}" if asin else "https://www.amazon.in",
                    rating=float(rating_match.group(1)) if rating_match else None,
                    in_stock=True,
                ))
            except Exception:
                continue
        return products
