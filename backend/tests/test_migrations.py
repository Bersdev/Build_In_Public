from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import create_engine, inspect

from app.core.database import Base

BACKEND = Path(__file__).resolve().parents[1]


def test_migracoes_criam_exatamente_as_tabelas_dos_modelos(tmp_path, monkeypatch):
    url = f"sqlite:///{(tmp_path / 'migracao.db').as_posix()}"
    monkeypatch.setenv("BIP_MIGRATION_URL", url)
    config = Config(BACKEND / "alembic.ini")
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    command.upgrade(config, "head")

    engine = create_engine(url)
    with engine.connect() as connection:
        diferencas = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    tabelas = set(inspect(engine).get_table_names())
    engine.dispose()

    assert diferencas == []
    assert set(Base.metadata.tables) <= tabelas
