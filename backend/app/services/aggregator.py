import asyncio
from app.models.product import Product
from app.scrapers.amazon   import AmazonScraper
from app.scrapers.myntra   import MyntraScraper
from app.scrapers.flipkart import FlipkartScraper
from app.scrapers.meesho   import MeeshoScraper
from app.scrapers.nykaa    import NykaaScraper
from app.scrapers.serpapi  import SerpApiScraper

# Max seconds any single scraper is allowed to run.
# Keeps the total response time predictable even when a site is slow to block.
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


async def run_search(query: str, category: str) -> list[Product]:
    # Direct scrapers run first in the result list so their source="direct" tag
    # wins deduplication when the same URL also appears in SerpAPI results.
    # Each scraper is bounded by its own timeout so a slow/blocked site cannot
    # delay the overall response.
    direct_scrapers = [MyntraScraper(), FlipkartScraper(), AmazonScraper(), MeeshoScraper(), NykaaScraper()]
    serp_scrapers   = [SerpApiScraper()]

    tasks = (
        [_safe_search(s, query, category, _DIRECT_TIMEOUT) for s in direct_scrapers] +
        [_safe_search(s, query, category, _SERP_TIMEOUT)   for s in serp_scrapers]
    )
    all_scrapers = direct_scrapers + serp_scrapers
    results = await asyncio.gather(*tasks)

    all_products: list[Product] = []
    for scraper, r in zip(all_scrapers, results):
        print(f"SCRAPER [{scraper.platform}] returned {len(r)} results")
        all_products.extend(r)

    # Deduplicate by product_url, filter zero-price, sort by price ascending
    seen = set()
    unique = []
    for p in all_products:
        if p.product_url not in seen:
            seen.add(p.product_url)
            unique.append(p)

    unique = [p for p in unique if p.price > 0]
    unique.sort(key=lambda p: p.price)
    return unique
