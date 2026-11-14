"""FastAPI entry point. Run: uvicorn main:app --reload --port 8000. Owner: A."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import VANTAGE_FRONTEND_ORIGIN
from routers import segments, sources, photon, media, topics, translate

app = FastAPI(title="Vantage API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[VANTAGE_FRONTEND_ORIGIN],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(segments.router, prefix="/api")
app.include_router(sources.router, prefix="/api")
app.include_router(photon.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(translate.router, prefix="/api")
app.mount("/media", StaticFiles(directory=media.MEDIA_DIR), name="media")


@app.get("/api/health")
def health():
    return {"status": "ok"}
