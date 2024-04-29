from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///./db.sqllite"


engine = create_async_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,  # , connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()


# Dependency
async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_async_session():
    async_session = SessionLocal()
    try:
        yield async_session
    finally:
        await async_session.close()
