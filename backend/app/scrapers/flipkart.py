import re
import json
import httpx
from bs4 import BeautifulSoup
from app.scrapers.base import BaseScraper
from app.models.product import Product

_BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

HEADERS = {
    "User-Agent": _BROWSER_UA,
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-IN,en;q=0.9",
}

# Price class names cycle; cover several generations
_PRICE_SELECTORS = [
    "div.hZ3P6w", "div._30jeq3", "div.Nx9bqj", "div._1_WHN1",
    "div[class*='price']", "div[class*='Price']",
]
_MRP_SELECTORS = [
    "div.kRYCnD", "div._3I9_wc", "div.yRaY8j", "div._3qQ9m1",
    "div[class*='mrp']", "div[class*='Mrp']",
]
_NAME_SELECTORS = [
    "a.atJtCj", "a.s1Q9rs", "div.KzDlHZ", "a.IRpwTa",
    "div[class*='title']", "div[class*='Title']",
]


def _find_first(card, selectors):
    for sel in selectors:
        el = card.select_one(sel)
        if el:
            return el
    return None


def _price_from_text(text: str) -> float:
    """Extract first ₹-prefixed number from arbitrary text."""
    m = re.search(r'₹\s*([0-9,]+)', text)
    if m:
        return float(m.group(1).replace(",", ""))
    return 0.0


class FlipkartScraper(BaseScraper):
    platform = "flipkart"

    async def search(self, query: str, category: str) -> list[Product]:
        products = await self._search_html(query)
        return products

    async def _search_html(self, query: str) -> list[Product]:
        url = "https://www.flipkart.com/search"
        params = {"q": query, "otracker": "search"}
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=HEADERS) as client:
                resp = await client.get(url, params=params)
                print(f"FLIPKART status={resp.status_code}")
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")
        except Exception as e:
            print(f"FLIPKART fetch error: {e}")
            return []

        # Try structured-selector approach first
        products = self._parse_cards(soup, query)
        if products:
            print(f"FLIPKART (cards) returned {len(products)} results")
            return products

        # Fallback: scan every element that looks like a price
        products = self._parse_structural(soup)
        print(f"FLIPKART (structural) returned {len(products)} results")
        return products

    def _parse_cards(self, soup: BeautifulSoup, query: str) -> list[Product]:
        """Parse product grid using known class-name selectors."""
        cards = soup.select("div[data-id]")[:15]
        products = []
        for card in cards:
            try:
                name_el  = _find_first(card, _NAME_SELECTORS)
                price_el = _find_first(card, _PRICE_SELECTORS)
                mrp_el   = _find_first(card, _MRP_SELECTORS)
                img_el   = card.select_one("img[src]")
                link_el  = card.select_one("a[href]")

                if not name_el or not price_el:
                    continue

                price = self._safe_price(price_el.get_text())
                if price <= 0:
                    # Try extracting ₹ amount from full card text
                    price = _price_from_text(card.get_text())
                if price <= 0:
                    continue

                mrp  = self._safe_price(mrp_el.get_text()) if mrp_el else price
                href = link_el["href"] if link_el else ""

                products.append(Product(
                    platform="flipkart",
                    product_name=name_el.get_text(strip=True),
                    price=price,
                    original_price=mrp if mrp >= price else price,
                    discount_percent=self._discount(price, mrp),
                    image_url=img_el["src"] if img_el else None,
                    product_url=f"https://www.flipkart.com{href}" if href.startswith("/") else href or "https://www.flipkart.com",
                    in_stock=True,
                ))
            except Exception:
                continue
        return products

    def _parse_structural(self, soup: BeautifulSoup) -> list[Product]:
        """
        Structural fallback: find product containers by looking for
        elements that have both an image and a ₹ price nearby.
        """
        products = []
        # Find all elements containing a price string
        price_tags = soup.find_all(string=re.compile(r'₹\s*\d'))
        seen_urls = set()

        for tag in price_tags[:30]:
            try:
                container = tag.find_parent("div", attrs={"data-id": True})
                if not container:
                    # Walk up 4 levels looking for a reasonable container
                    el = tag.parent
                    for _ in range(4):
                        if el and el.name == "div":
                            container = el
                            break
                        el = el.parent if el else None
                if not container:
                    continue

                link_el = container.select_one("a[href*='/p/']") or container.select_one("a[href]")
                if not link_el:
                    continue

                href = link_el.get("href", "")
                product_url = f"https://www.flipkart.com{href}" if href.startswith("/") else href
                if product_url in seen_urls:
                    continue
                seen_urls.add(product_url)

                # Best-effort name: longest anchor text in container
                anchors = container.select("a[href]")
                name = max((a.get_text(strip=True) for a in anchors), key=len, default="")
                if not name:
                    continue

                price = _price_from_text(str(tag))
                if price <= 0:
                    continue

                img_el = container.select_one("img[src]")

                products.append(Product(
                    platform="flipkart",
                    product_name=name,
                    price=price,
                    original_price=price,
                    discount_percent=0,
                    image_url=img_el["src"] if img_el else None,
                    product_url=product_url,
                    in_stock=True,
                ))
                if len(products) >= 12:
                    break
            except Exception:
                continue

        return products
