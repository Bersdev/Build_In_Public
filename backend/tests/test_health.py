from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_informa_que_a_api_esta_no_ar():
    resposta = client.get("/health")

    assert resposta.status_code == 200
    assert resposta.json() == {"status": "ok"}
