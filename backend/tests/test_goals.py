from app.core.dates import local_today

URL = "/api/v1/goals"
HOJE = local_today("America/Sao_Paulo").isoformat()


def _meta(client, **campos):
    resposta = client.post(URL, json={"title": "Meta", "target_value": 10, **campos})
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def _estudar(client, minutos, data=HOJE):
    resposta = client.post("/api/v1/study-sessions", json={"study_date": data, "duration_minutes": minutos})
    assert resposta.status_code == 201


def test_meta_semanal_usa_as_horas_da_semana_atual(client):
    meta = _meta(client, kind="weekly_study_hours", target_value=4)
    _estudar(client, 120)
    _estudar(client, 600, "2020-01-01")
    atual = client.get(f"{URL}/{meta['id']}").json()
    assert atual["current_value"] == 2
    assert atual["progress_percent"] == 50
    assert atual["is_reached"] is False


def test_meta_de_horas_totais_soma_todo_o_historico(client):
    meta = _meta(client, kind="total_study_hours", target_value=2)
    _estudar(client, 60)
    _estudar(client, 90, "2020-01-01")
    atual = client.get(f"{URL}/{meta['id']}").json()
    assert atual["current_value"] == 2.5
    assert atual["progress_percent"] == 100
    assert atual["is_reached"] is True


def test_meta_de_projetos_e_cursos_conta_os_concluidos(client):
    projetos = _meta(client, kind="completed_projects", target_value=2)
    cursos = _meta(client, kind="completed_courses", target_value=1)
    client.post("/api/v1/projects", json={"name": "A", "status": "completed"})
    client.post("/api/v1/projects", json={"name": "B"})
    client.post("/api/v1/courses", json={"title": "C", "status": "completed"})
    assert client.get(f"{URL}/{projetos['id']}").json()["current_value"] == 1
    assert client.get(f"{URL}/{cursos['id']}").json()["is_reached"] is True


def test_meta_manual_usa_o_valor_informado(client):
    meta = _meta(client, kind="manual", target_value=50)
    atual = client.patch(f"{URL}/{meta['id']}", json={"manual_value": 25}).json()
    assert atual["current_value"] == 25
    assert atual["progress_percent"] == 50


def test_validacoes_de_meta(client):
    assert client.post(URL, json={"title": "", "target_value": 1}).status_code == 422
    assert client.post(URL, json={"title": "A", "target_value": 0}).status_code == 422
    assert client.post(URL, json={"title": "A", "target_value": 1, "kind": "x"}).status_code == 422


def test_concluir_reabrir_e_filtrar_metas(client):
    meta = _meta(client)
    assert client.patch(f"{URL}/{meta['id']}", json={"completed": True}).json()["completed_at"]
    assert client.get(URL, params={"active": True}).json() == []
    assert len(client.get(URL).json()) == 1
    assert client.patch(f"{URL}/{meta['id']}", json={"completed": False}).json()["completed_at"] is None
    assert len(client.get(URL, params={"active": True}).json()) == 1


def test_excluir_meta(client):
    meta = _meta(client)
    assert client.delete(f"{URL}/{meta['id']}").status_code == 204
    assert client.get(f"{URL}/{meta['id']}").status_code == 404


def test_meta_de_outro_usuario_e_invisivel_e_nao_soma_dados_alheios(client, other_client):
    meta = _meta(client, kind="total_study_hours", target_value=1)
    _estudar(other_client, 600)
    assert client.get(f"{URL}/{meta['id']}").json()["current_value"] == 0
    assert other_client.get(URL).json() == []
    assert other_client.get(f"{URL}/{meta['id']}").status_code == 404
    assert other_client.patch(f"{URL}/{meta['id']}", json={"completed": True}).status_code == 404
    assert other_client.delete(f"{URL}/{meta['id']}").status_code == 404
