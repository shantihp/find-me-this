import asyncio
from app.models.product import Product
from app.scrapers.amazon   import AmazonScraper
from app.scrapers.serpapi  import SerpApiScraper

async def run_search(query: str, category: str) -> list[Product]:
    # SerpAPI covers Myntra/Flipkart/Ajio/Nykaa/Meesho via Google Shopping —
    # those sites block direct scraping from cloud IPs.
    # Amazon uses its own API and is kept as a direct scraper.
    scrapers = [SerpApiScraper(), AmazonScraper()]
    tasks = [s.search(query, category) for s in scrapers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_products: list[Product] = []
    for scraper, r in zip(scrapers, results):
        if isinstance(r, Exception):
            print(f"SCRAPER [{scraper.platform}] exception: {r}")
        elif isinstance(r, list):
            print(f"SCRAPER [{scraper.platform}] returned {len(r)} results")
            all_products.extend(r)

    # Deduplicate by product_url, sort by price ascending
    seen = set()
    unique = []
    for p in all_products:
        if p.product_url not in seen:
            seen.add(p.product_url)
            unique.append(p)

    unique = [p for p in unique if p.price > 0]
    unique.sort(key=lambda p: p.price)
    return unique
