import asyncio
from app.models.product import Product
from app.scrapers.amazon   import AmazonScraper
from app.scrapers.myntra   import MyntraScraper
from app.scrapers.flipkart import FlipkartScraper
from app.scrapers.serpapi  import SerpApiScraper

async def run_search(query: str, category: str) -> list[Product]:
    # SerpAPI covers all Indian platforms via Google Shopping (India region).
    # Myntra and Flipkart have direct integrations for richer/fresher results.
    # Amazon is scraped directly from amazon.in.
    # All non-Indian domains are filtered at the SerpAPI layer.
    # Direct scrapers first — their source="direct" tag wins deduplication
    # when the same URL also appears in SerpAPI results.
    scrapers = [MyntraScraper(), FlipkartScraper(), AmazonScraper(), SerpApiScraper()]
    tasks = [s.search(query, category) for s in scrapers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_products: list[Product] = []
    for scraper, r in zip(scrapers, results):
        if isinstance(r, Exception):
            print(f"SCRAPER [{scraper.platform}] exception: {r}")
        elif isinstance(r, list):
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
