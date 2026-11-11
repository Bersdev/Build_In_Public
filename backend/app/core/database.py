import sqlite3
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from sqlalchemy import DateTime, Engine, create_engine, event
from sqlalchemy.engine import make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.types import TypeDecorator

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


class UTCDateTime(TypeDecorator):
    """Guarda sempre em UTC e devolve datas com fuso, em SQLite e PostgreSQL."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect):
        return value.astimezone(UTC).replace(tzinfo=None) if value else None

    def process_result_value(self, value: datetime | None, dialect):
        return value.replace(tzinfo=UTC) if value else None


def utcnow() -> datetime:
    return datetime.now(UTC)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(connection, _record):
    # O SQLite ignora chaves estrangeiras se isto não for ligado a cada conexão.
    if isinstance(connection, sqlite3.Connection):
        connection.execute("PRAGMA foreign_keys=ON")


def build_engine(url: str) -> Engine:
    parsed = make_url(url)
    if parsed.get_backend_name() != "sqlite":
        # Em funções serverless a conexão pode ter sido encerrada pelo banco entre duas chamadas.
        return create_engine(url, pool_pre_ping=True, pool_size=2, max_overflow=3, pool_recycle=300)
    if parsed.database and parsed.database != ":memory:":
        Path(parsed.database).parent.mkdir(parents=True, exist_ok=True)
    return create_engine(url, connect_args={"check_same_thread": False})


engine = build_engine(get_settings().resolved_database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session


Db = Annotated[Session, Depends(get_db)]
