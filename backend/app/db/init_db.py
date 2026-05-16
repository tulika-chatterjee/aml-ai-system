"""Create tables (dev convenience — use Alembic in production)."""

import asyncio

from sqlalchemy.ext.asyncio import AsyncEngine

from app.db.models import Base
from app.db.seed_demo import ensure_demo_alerts
from app.db.session import AsyncSessionLocal, engine


async def init_models(engine_: AsyncEngine) -> None:
    async with engine_.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def init_models_and_seed(engine_: AsyncEngine) -> None:
    await init_models(engine_)
    async with AsyncSessionLocal() as session:
        await ensure_demo_alerts(session)


def main() -> None:
    asyncio.run(init_models_and_seed(engine))


if __name__ == "__main__":
    main()
