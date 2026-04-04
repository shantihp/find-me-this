from pydantic import BaseModel
from typing import Optional

class Product(BaseModel):
    platform: str
    product_name: str
    price: float
    original_price: float = 0
    discount_percent: int = 0
    image_url: Optional[str] = None
    product_url: str
    rating: Optional[float] = None
    in_stock: bool = True

class IdentifyResponse(BaseModel):
    category: str       # fashion | beauty | footwear | accessories | unknown
    sub_type: str
    attributes: str
    search_query: str
