from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BaseProj = declarative_base()


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


# Dependency
def get_engine(path: str):
    return create_async_engine("sqlite+aiosqlite:///" + path, echo=False)


def get_session(engine: AsyncEngine):
    return sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_async_session(path: str):
    sessionMak = get_session(get_engine(path))
    async_session = sessionMak()
    try:
        yield async_session
    finally:
        await async_session.close()


async def make_proj_db_and_tables(path: str):
    engine = get_engine(path)
    async with engine.begin() as conn:
        await conn.run_sync(BaseProj.metadata.create_all)
