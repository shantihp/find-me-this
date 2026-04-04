from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import identify, search, bookmarks, favourites, history, profile, text_search

app = FastAPI(title="FindMeThis API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten to Amplify domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(identify.router)
app.include_router(search.router)
app.include_router(bookmarks.router)
app.include_router(favourites.router)
app.include_router(history.router)
app.include_router(profile.router)
app.include_router(text_search.router)

@app.get("/health")
def health():
    return {"status": "ok"}
