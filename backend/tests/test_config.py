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


def test_producao_na_vercel_exige_configuracao_segura():
    import pytest

    from app.core.config import Settings, assert_safe_for_production

    seguro = Settings(environment="production", cookie_secure=True, _env_file=None)
    assert_safe_for_production(seguro, on_vercel=True)
    assert_safe_for_production(Settings(_env_file=None), on_vercel=False)  # desenvolvimento local
    for inseguro in (
        Settings(environment="development", cookie_secure=True, _env_file=None),
        Settings(environment="production", cookie_secure=False, _env_file=None),
    ):
        with pytest.raises(RuntimeError):
            assert_safe_for_production(inseguro, on_vercel=True)
