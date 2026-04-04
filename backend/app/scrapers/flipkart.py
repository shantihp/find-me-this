import httpx
import json
from bs4 import BeautifulSoup
from app.scrapers.base import BaseScraper
from app.models.product import Product

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-IN",
}

class FlipkartScraper(BaseScraper):
    platform = "flipkart"

    async def search(self, query: str, category: str) -> list[Product]:
        url = "https://www.flipkart.com/search"
        params = {"q": query, "otracker": "search"}
        try:
            async with httpx.AsyncClient(timeout=12, follow_redirects=True, headers=HEADERS) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
        except Exception:
            return []

        products = []
        # Flipkart uses different CSS classes based on layout — try multiple selectors
        cards = (
            soup.select("div._1AtVbE div._13oc-S") or
            soup.select("div._2kHMtA") or
            soup.select("div[data-id]")
        )[:10]

        for card in cards:
            try:
                name_el   = card.select_one("div._4rR01T, a.s1Q9rs, div.IRpwTa")
                price_el  = card.select_one("div._30jeq3, div._1_WHN1")
                mrp_el    = card.select_one("div._3I9_wc")
                img_el    = card.select_one("img._396cs4, img._2r_T1I")
                link_el   = card.select_one("a._1fQZEK, a.s1Q9rs, a._2rpwqI")

                if not name_el or not price_el:
                    continue

                price = self._safe_price(price_el.text)
                mrp   = self._safe_price(mrp_el.text) if mrp_el else price
                href  = link_el["href"] if link_el else ""

                products.append(Product(
                    platform="flipkart",
                    product_name=name_el.text.strip(),
                    price=price,
                    original_price=mrp,
                    discount_percent=self._discount(price, mrp),
                    image_url=img_el["src"] if img_el else None,
                    product_url=f"https://www.flipkart.com{href}" if href.startswith("/") else href or "https://www.flipkart.com",
                    in_stock=True,
                ))
            except Exception:
                continue
        return products
