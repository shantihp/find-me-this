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


async def run_search(query: str, category: str) -> list[dict]:
    direct_scrapers = [MyntraScraper(), FlipkartScraper(), AmazonScraper(), MeeshoScraper(), NykaaScraper()]
    serp_scrapers   = [SerpApiScraper()]
    all_scrapers    = direct_scrapers + serp_scrapers

    tasks = (
        [_safe_search(s, query, category, _DIRECT_TIMEOUT) for s in direct_scrapers] +
        [_safe_search(s, query, category, _SERP_TIMEOUT)   for s in serp_scrapers]
    )
    results = await asyncio.gather(*tasks)

    # Pair each result list with its source label — determined by scraper identity,
    # NOT by a field on the Product model (avoids Pydantic serialization surprises).
    direct_set = {type(s) for s in direct_scrapers}
    all_items: list[tuple[Product, str]] = []
    for scraper, r in zip(all_scrapers, results):
        source = "direct" if type(scraper) in direct_set else "serpapi"
        print(f"SCRAPER [{scraper.platform}] returned {len(r)} results")
        for p in r:
            all_items.append((p, source))

    # Deduplicate by URL (direct scrapers come first so their version wins),
    # filter zero-price, sort ascending, then inject source into the dict so it
    # is always present in the JSON response regardless of the Pydantic schema.
    seen: set[str] = set()
    unique: list[dict] = []
    for p, source in all_items:
        if p.product_url not in seen and p.price > 0:
            seen.add(p.product_url)
            d = p.model_dump()
            d["source"] = source   # always written at dict level — never missing
            unique.append(d)

    unique.sort(key=lambda d: d["price"])
    return unique
