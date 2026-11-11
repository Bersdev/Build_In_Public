import os

from alembic import context
from sqlalchemy import create_engine

import app.models  # noqa: F401  registra todas as tabelas
from app.core.config import get_settings
from app.core.database import Base, build_engine

# BIP_MIGRATION_URL permite testar as migrações sem tocar no banco real.
override_url = os.environ.get("BIP_MIGRATION_URL")
engine = create_engine(override_url) if override_url else build_engine(get_settings().resolved_database_url)

with engine.connect() as connection:
    # render_as_batch é necessário porque o SQLite não altera colunas diretamente.
    context.configure(connection=connection, target_metadata=Base.metadata, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()
engine.dispose()
