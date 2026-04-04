import os
import httpx
from jose import jwt, JWTError
from functools import lru_cache
from fastapi import Request

REGION      = os.getenv("AWS_REGION", "ap-south-1")
USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "")
CLIENT_ID    = os.getenv("COGNITO_CLIENT_ID", "")

@lru_cache(maxsize=1)
def _jwks():
    if not USER_POOL_ID:
        return {}
    url = f"https://cognito-idp.{REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
    resp = httpx.get(url, timeout=5)
    return resp.json()

def get_user_id(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        header = jwt.get_unverified_header(token)
        keys = {k["kid"]: k for k in _jwks().get("keys", [])}
        key = keys.get(header["kid"])
        if not key:
            return None
        payload = jwt.decode(token, key, algorithms=["RS256"], audience=CLIENT_ID)
        return payload.get("sub")
    except (JWTError, Exception):
        return None
