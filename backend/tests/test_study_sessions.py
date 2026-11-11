from datetime import date, timedelta

import pytest

URL = "/api/v1/study-sessions"


def _sessao(**campos):
    return {"study_date": "2026-01-10", "duration_minutes": 60, "technology": "Python", **campos}


def test_criar_e_consultar_sessao(client):
    criada = client.post(URL, json=_sessao(notes="Listas"))
    assert criada.status_code == 201
    corpo = criada.json()
    assert corpo["technology"] == "Python"
    assert corpo["duration_minutes"] == 60
    assert client.get(f"{URL}/{corpo['id']}").json()["notes"] == "Listas"


def test_tecnologia_nao_diferencia_maiusculas(client):
    client.post(URL, json=_sessao(technology="Python"))
    client.post(URL, json=_sessao(technology="python"))
    nomes = {item["name"] for item in client.get("/api/v1/technologies").json()}
    assert nomes == {"Python"}


def test_editar_sessao(client):
    sessao = client.post(URL, json=_sessao()).json()
    resposta = client.patch(f"{URL}/{sessao['id']}", json={"duration_minutes": 90, "technology": "SQL"})
    assert resposta.status_code == 200
    assert resposta.json()["duration_minutes"] == 90
    assert resposta.json()["technology"] == "SQL"


def test_excluir_sessao(client):
    sessao = client.post(URL, json=_sessao()).json()
    assert client.delete(f"{URL}/{sessao['id']}").status_code == 204
    assert client.get(f"{URL}/{sessao['id']}").status_code == 404


@pytest.mark.parametrize("minutos", [0, -5, 1441])
def test_duracao_invalida_e_recusada(client, minutos):
    assert client.post(URL, json=_sessao(duration_minutes=minutos)).status_code == 422


def test_data_futura_e_recusada(client):
    futuro = (date.today() + timedelta(days=3)).isoformat()
    assert client.post(URL, json=_sessao(study_date=futuro)).status_code == 422


def test_listar_filtrar_e_ordenar(client):
    client.post(URL, json=_sessao(study_date="2026-01-10", technology="Python"))
    client.post(URL, json=_sessao(study_date="2026-02-10", technology="SQL"))

    todas = client.get(URL).json()
    assert [s["study_date"] for s in todas] == ["2026-02-10", "2026-01-10"]
    assert len(client.get(URL, params={"technology": "sql"}).json()) == 1
    assert len(client.get(URL, params={"date_from": "2026-02-01"}).json()) == 1
    assert len(client.get(URL, params={"date_to": "2026-01-31"}).json()) == 1


def test_sessao_de_outro_usuario_e_invisivel(client, other_client):
    sessao = client.post(URL, json=_sessao()).json()
    caminho = f"{URL}/{sessao['id']}"

    assert other_client.get(URL).json() == []
    assert other_client.get(caminho).status_code == 404
    assert other_client.patch(caminho, json={"duration_minutes": 1}).status_code == 404
    assert other_client.delete(caminho).status_code == 404
    assert client.get(caminho).json()["duration_minutes"] == 60


def test_sessao_criada_pelo_diario_so_e_editada_pelo_diario(client):
    client.post("/api/v1/journal", json={"title": "A", "entry_date": "2026-01-10", "duration_minutes": 30})
    sessao = client.get(URL).json()[0]
    assert client.patch(f"{URL}/{sessao['id']}", json={"duration_minutes": 90}).status_code == 422
    assert client.get(URL).json()[0]["duration_minutes"] == 30


def test_exige_login(anonymous):
    assert anonymous.get(URL).status_code == 401
    assert anonymous.post(URL, json=_sessao()).status_code == 401
