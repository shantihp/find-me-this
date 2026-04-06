import re
import httpx
from app.scrapers.base import BaseScraper
from app.models.product import Product

_BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

_JSON_HEADERS = {
    "User-Agent": _BROWSER_UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-IN,en;q=0.9",
    "Referer": "https://www.myntra.com/",
    "Origin": "https://www.myntra.com",
    "x-meta-app": '{"appFamily":"Web","appVersion":"1.0.0"}',
}

_HTML_HEADERS = {
    "User-Agent": _BROWSER_UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IN,en;q=0.9",
}


def _unescape(s: str) -> str:
    try:
        return s.encode().decode("unicode_escape")
    except Exception:
        return s.replace(r"\u002F", "/")


class MyntraScraper(BaseScraper):
    platform = "myntra"

    async def search(self, query: str, category: str) -> list[Product]:
        products = await self._search_api(query)
        if not products:
            products = await self._search_html(query)
        return products

    async def _search_api(self, query: str) -> list[Product]:
        """Use Myntra's internal gateway API — returns clean JSON."""
        url = "https://www.myntra.com/gateway/v2/product/list"
        params = {
            "keyword": query,
            "pageNo": 1,
            "pageSize": 24,
            "plaEnabled": "false",
        }
        try:
            # No warm-up request — it just adds latency when the API is blocked
            async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
                resp = await client.get(url, params=params, headers=_JSON_HEADERS)
                print(f"MYNTRA API status={resp.status_code}")
                if resp.status_code != 200:
                    return []
                data = resp.json()
        except Exception as e:
            print(f"MYNTRA API error: {e}")
            return []

        products = []
        for item in data.get("products", [])[:24]:
            try:
                price = float(item.get("price", 0))
                if price <= 0:
                    continue
                mrp = float(item.get("mrp", price))
                pid = item.get("productId", "")
                slug = item.get("landingPageUrl", "")
                img = item.get("searchImage", "") or item.get("images", [{}])[0].get("src", "")
                rating_raw = item.get("rating")
                products.append(Product(
                    platform="myntra",
                    product_name=item.get("productName", ""),
                    price=price,
                    original_price=mrp,
                    discount_percent=self._discount(price, mrp),
                    image_url=img or None,
                    product_url=f"https://www.myntra.com/{slug}" if slug else f"https://www.myntra.com/{pid}/buy",
                    rating=float(rating_raw) if rating_raw else None,
                    in_stock=True,
                    source="direct",
                ))
            except Exception:
                continue

        print(f"MYNTRA API returned {len(products)} results")
        return products

    async def _search_html(self, query: str) -> list[Product]:
        """Fallback: parse embedded JS JSON from Myntra's search page."""
        slug = query.replace(" ", "-").lower()
        url = f"https://www.myntra.com/{slug}"
        try:
            async with httpx.AsyncClient(timeout=8, follow_redirects=True, headers=_HTML_HEADERS) as client:
                resp = await client.get(url, headers=_HTML_HEADERS)
                print(f"MYNTRA HTML status={resp.status_code} len={len(resp.text)}")
                resp.raise_for_status()
                html = resp.text
        except Exception as e:
            print(f"MYNTRA HTML fetch error: {e}")
            return []

        blocks = re.split(r'\{"landingPageUrl":', html)[1:21]
        print(f"MYNTRA HTML blocks found: {len(blocks)}")
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
                    source="direct",
                ))
            except Exception:
                continue

        print(f"MYNTRA HTML returned {len(products)} results")
        return products
