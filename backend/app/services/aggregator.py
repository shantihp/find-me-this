import asyncio
from app.models.product import Product
from app.scrapers.amazon   import AmazonScraper
from app.scrapers.myntra   import MyntraScraper
from app.scrapers.flipkart import FlipkartScraper
from app.scrapers.meesho   import MeeshoScraper
from app.scrapers.nykaa    import NykaaScraper
from app.scrapers.serpapi  import SerpApiScraper

_DIRECT_TIMEOUT = 12
_SERP_TIMEOUT   = 20


async def _safe_search(scraper, query: str, category: str, timeout: int) -> list[Product]:
    try:
        return await asyncio.wait_for(scraper.search(query, category), timeout=timeout)
    except asyncio.TimeoutError:
        print(f"SCRAPER [{scraper.platform}] timed out after {timeout}s")
        return []
    except Exception as e:
        print(f"SCRAPER [{scraper.platform}] exception: {e}")
        return []


async def run_search(query: str, category: str) -> dict:
    """Return {"direct": [...], "google_shopping": [...]} — two pre-split lists."""
    direct_scrapers = [MyntraScraper(), FlipkartScraper(), AmazonScraper(), MeeshoScraper(), NykaaScraper()]
    serp_scrapers   = [SerpApiScraper()]
    all_scrapers    = direct_scrapers + serp_scrapers

    tasks = (
        [_safe_search(s, query, category, _DIRECT_TIMEOUT) for s in direct_scrapers] +
        [_safe_search(s, query, category, _SERP_TIMEOUT)   for s in serp_scrapers]
    )
    results = await asyncio.gather(*tasks)

    direct_set = {type(s) for s in direct_scrapers}
    direct_items: list[dict] = []
    serp_items:   list[dict] = []

    seen: set[str] = set()
    for scraper, r in zip(all_scrapers, results):
        is_direct = type(scraper) in direct_set
        print(f"SCRAPER [{scraper.platform}] returned {len(r)} results")
        for p in r:
            if p.product_url in seen or p.price <= 0:
                continue
            seen.add(p.product_url)
            d = p.model_dump()
            if is_direct:
                direct_items.append(d)
            else:
                serp_items.append(d)

    direct_items.sort(key=lambda d: d["price"])
    serp_items.sort(key=lambda d: d["price"])

    return {"direct": direct_items, "google_shopping": serp_items}
