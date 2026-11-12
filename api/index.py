"""Ponto de entrada da API na Vercel. Todas as rotas /api/* chegam aqui (veja vercel.json)."""

import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND))

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.config import assert_safe_for_production, get_settings  # noqa: E402
from app.core.database import engine  # noqa: E402
from app.main import app  # noqa: E402,F401  a Vercel procura a variável "app"

MIGRATION_LOCK = 72_620_261


def _migrate() -> None:
    """Aplica as migrações pendentes. A trava impede que duas instâncias migrem ao mesmo tempo."""
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    with engine.connect() as connection:
        connection.execute(text("SELECT pg_advisory_lock(:k)"), {"k": MIGRATION_LOCK})
        try:
            command.upgrade(config, "head")
        finally:
            connection.execute(text("SELECT pg_advisory_unlock(:k)"), {"k": MIGRATION_LOCK})
            connection.commit()


assert_safe_for_production(get_settings(), on_vercel=bool(os.environ.get("VERCEL")))

if get_settings().environment == "production" and engine.dialect.name == "postgresql":
    _migrate()
