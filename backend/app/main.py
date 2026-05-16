from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router
from app.config import get_settings
from app.db.init_db import init_models
from app.db.seed_demo import ensure_demo_alerts
from app.db.session import AsyncSessionLocal, engine

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_models(engine)
    async with AsyncSessionLocal() as session:
        try:
            await ensure_demo_alerts(session)
        except Exception:
            import logging

            logging.exception("Demo alert seed failed — ensure Postgres is up and DATABASE_URL is set")
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": settings.app_name, "docs": "/docs"}
