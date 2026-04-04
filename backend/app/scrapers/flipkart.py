import httpx
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
                soup = BeautifulSoup(resp.text, "html.parser")
                cards = soup.select("div[data-id]")
                print(f"FLIPKART status={resp.status_code} cards={len(cards)}")
                resp.raise_for_status()
        except Exception as e:
            print(f"FLIPKART fetch error: {e}")
            return []

        products = []
        for card in soup.select("div[data-id]")[:10]:
            try:
                # Current class names (as of 2026)
                name_el  = card.select_one("a.atJtCj, a.s1Q9rs, div.KzDlHZ")
                price_el = card.select_one("div.hZ3P6w, div._30jeq3")
                mrp_el   = card.select_one("div.kRYCnD, div._3I9_wc")
                img_el   = card.select_one("img[src]")
                link_el  = card.select_one("a[href]")

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
