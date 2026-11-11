from app.core.config import normalize_database_url


def test_url_do_postgres_usa_o_driver_psycopg():
    assert normalize_database_url("postgres://u:s@host/db") == "postgresql+psycopg://u:s@host/db"
    assert normalize_database_url("postgresql://u:s@host/db?sslmode=require") == (
        "postgresql+psycopg://u:s@host/db?sslmode=require"
    )


def test_outras_urls_ficam_iguais():
    assert normalize_database_url("sqlite://") == "sqlite://"
    assert normalize_database_url("postgresql+psycopg://u@h/d") == "postgresql+psycopg://u@h/d"
    assert normalize_database_url("") == ""
