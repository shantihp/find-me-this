import asyncio
import logging
from app.models.product import Product

logger = logging.getLogger(__name__)
from app.scrapers.myntra   import MyntraScraper
from app.scrapers.nykaa    import NykaaScraper
from app.scrapers.amazon   import AmazonScraper
from app.scrapers.flipkart import FlipkartScraper
from app.scrapers.ajio     import AjioScraper
from app.scrapers.meesho   import MeeshoScraper

# Which scrapers to run per category
CATEGORY_MAP = {
    "fashion":     [MyntraScraper, AmazonScraper, FlipkartScraper, AjioScraper, MeeshoScraper],
    "beauty":      [NykaaScraper, AmazonScraper, FlipkartScraper, MyntraScraper],
    "footwear":    [MyntraScraper, AmazonScraper, FlipkartScraper, AjioScraper],
    "accessories": [MyntraScraper, AmazonScraper, FlipkartScraper, AjioScraper, MeeshoScraper],
    "unknown":     [MyntraScraper, AmazonScraper, FlipkartScraper, NykaaScraper],
}

async def run_search(query: str, category: str) -> list[Product]:
    scrapers = [cls() for cls in CATEGORY_MAP.get(category, CATEGORY_MAP["unknown"])]
    tasks = [s.search(query, category) for s in scrapers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_products: list[Product] = []
    for scraper, r in zip(scrapers, results):
        if isinstance(r, Exception):
            print(f"SCRAPER [{scraper.platform}] exception: {r}")
        elif isinstance(r, list):
            print(f"SCRAPER [{scraper.platform}] returned {len(r)} results")
            all_products.extend(r)
        else:
            print(f"SCRAPER [{scraper.platform}] unexpected result: {type(r)}")

    # Sort by price ascending, filter out zero-price items
    all_products = [p for p in all_products if p.price > 0]
    all_products.sort(key=lambda p: p.price)
    return all_products
