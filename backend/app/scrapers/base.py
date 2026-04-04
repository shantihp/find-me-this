from abc import ABC, abstractmethod
from app.models.product import Product

class BaseScraper(ABC):
    platform: str = ""

    @abstractmethod
    async def search(self, query: str, category: str) -> list[Product]:
        ...

    def _safe_price(self, raw: str | int | float) -> float:
        if isinstance(raw, (int, float)):
            return float(raw)
        try:
            cleaned = str(raw).replace("₹", "").replace(",", "").replace(" ", "").strip()
            return float(cleaned)
        except (ValueError, AttributeError):
            return 0.0

    def _discount(self, price: float, original: float) -> int:
        if original > price > 0:
            return round((original - price) / original * 100)
        return 0
