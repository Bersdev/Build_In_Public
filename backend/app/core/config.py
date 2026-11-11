import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


def default_database_url() -> str:
    # O banco fica fora do OneDrive, cuja sincronização pode travar o SQLite.
    base = Path(os.environ.get("LOCALAPPDATA", Path.home() / ".local" / "share"))
    return f"sqlite:///{(base / 'BuildInPublic' / 'build_in_public.db').as_posix()}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    environment: str = "development"
    database_url: str = ""
    cookie_name: str = "bip_session"
    cookie_secure: bool = False
    session_days: int = 14
    password_reset_minutes: int = 60
    frontend_url: str = "http://localhost:5173"

    @property
    def resolved_database_url(self) -> str:
        return normalize_database_url(self.database_url) or default_database_url()


def normalize_database_url(url: str) -> str:
    """Neon, Vercel e Railway entregam postgres:// ou postgresql://; o SQLAlchemy usa o driver psycopg."""
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
