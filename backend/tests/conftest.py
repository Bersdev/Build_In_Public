import os

# Precisa vir antes de importar a aplicação, para nunca tocar no banco real.
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["COOKIE_SECURE"] = "false"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  registra todas as tabelas
from app.core.database import Base, get_db
from app.main import app as fastapi_app

PASSWORD = "senha-segura-123"


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def db(session_factory):
    with session_factory() as session:
        yield session


@pytest.fixture
def new_client(session_factory):
    def override_get_db():
        with session_factory() as session:
            yield session

    fastapi_app.dependency_overrides[get_db] = override_get_db
    yield lambda: TestClient(fastapi_app)
    fastapi_app.dependency_overrides.clear()


def _register(client: TestClient, email: str) -> TestClient:
    response = client.post(
        "/api/v1/auth/register",
        json={"name": "Pessoa Teste", "email": email, "password": PASSWORD},
    )
    assert response.status_code == 201, response.text
    return client


@pytest.fixture
def client(new_client):
    """Cliente já autenticado."""
    return _register(new_client(), "ana@exemplo.com")


@pytest.fixture
def other_client(new_client):
    """Segundo usuário, para testar o isolamento de dados."""
    return _register(new_client(), "bia@exemplo.com")


@pytest.fixture
def anonymous(new_client):
    return new_client()
