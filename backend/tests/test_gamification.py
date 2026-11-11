from datetime import timedelta

from app.core.dates import local_today

URL = "/api/v1/gamification"
HOJE = local_today("America/Sao_Paulo")


def _xp(client):
    return client.get(URL).json()["xp"]


def _conquistas(client):
    return {a["code"] for a in client.get(URL).json()["achievements"] if a["unlocked_at"]}


def test_conta_nova_comeca_no_nivel_um_sem_conquistas(client):
    estado = client.get(URL).json()
    assert estado["xp"] == 0
    assert estado["level"] == 1
    assert estado["next_level_xp"] == 100
    assert estado["current_streak"] == 0
    assert _conquistas(client) == set()
    assert estado["rules"]


def test_sessao_soma_xp_ajusta_ao_editar_e_retira_ao_excluir(client):
    sessao = client.post(
        "/api/v1/study-sessions", json={"study_date": HOJE.isoformat(), "duration_minutes": 60}
    ).json()
    assert _xp(client) == 6
    client.patch(f"/api/v1/study-sessions/{sessao['id']}", json={"duration_minutes": 120})
    assert _xp(client) == 12
    client.delete(f"/api/v1/study-sessions/{sessao['id']}")
    assert _xp(client) == 0


def test_registro_do_diario_soma_xp_do_registro_e_do_tempo(client):
    registro = client.post(
        "/api/v1/journal", json={"title": "A", "entry_date": HOJE.isoformat(), "duration_minutes": 30}
    ).json()
    assert _xp(client) == 13
    client.delete(f"/api/v1/journal/{registro['id']}")
    assert _xp(client) == 0


def test_concluir_a_mesma_tarefa_duas_vezes_nao_duplica_xp(client):
    tarefa = client.post("/api/v1/tasks", json={"title": "T"}).json()
    caminho = f"/api/v1/tasks/{tarefa['id']}"
    client.patch(caminho, json={"status": "done"})
    client.patch(caminho, json={"status": "done"})
    assert _xp(client) == 5
    client.patch(caminho, json={"status": "todo"})
    assert _xp(client) == 0
    client.patch(caminho, json={"status": "done"})
    assert _xp(client) == 5


def test_excluir_tarefa_concluida_retira_o_xp(client):
    tarefa = client.post("/api/v1/tasks", json={"title": "T", "status": "done"}).json()
    assert _xp(client) == 5
    client.delete(f"/api/v1/tasks/{tarefa['id']}")
    assert _xp(client) == 0


def test_xp_de_projeto_meta_curso_e_conteudo(client):
    projeto = client.post("/api/v1/projects", json={"name": "P"}).json()
    client.patch(f"/api/v1/projects/{projeto['id']}", json={"status": "completed"})
    assert _xp(client) == 50

    meta = client.post("/api/v1/goals", json={"title": "M", "target_value": 1}).json()
    client.patch(f"/api/v1/goals/{meta['id']}", json={"completed": True})
    assert _xp(client) == 80

    curso = client.post("/api/v1/courses", json={"title": "C"}).json()
    client.patch(f"/api/v1/courses/{curso['id']}", json={"status": "completed"})
    assert _xp(client) == 100

    trilha = client.post("/api/v1/learning-paths", json={"title": "T"}).json()
    etapa = client.post(f"/api/v1/learning-paths/{trilha['id']}/stages", json={"title": "E"}).json()
    item = client.post(f"/api/v1/learning-stages/{etapa['id']}/items", json={"title": "I"}).json()
    client.patch(f"/api/v1/learning-items/{item['id']}", json={"completed": True})
    assert _xp(client) == 105
    assert client.get(URL).json()["level"] == 2

    client.delete(f"/api/v1/learning-paths/{trilha['id']}")
    assert _xp(client) == 100


def test_conquistas_sao_desbloqueadas_e_ficam_na_linha_do_tempo(client):
    client.post("/api/v1/study-sessions", json={"study_date": HOJE.isoformat(), "duration_minutes": 10})
    client.post("/api/v1/journal", json={"title": "A", "entry_date": HOJE.isoformat()})
    conquistas = _conquistas(client)
    assert {"first_session", "entries_1"} <= conquistas
    assert "hours_10" not in conquistas
    titulos = [a["title"] for a in client.get("/api/v1/activity").json()]
    assert any(t.startswith("Conquista:") for t in titulos)


def test_conquista_permanece_depois_de_excluir_o_registro(client):
    registro = client.post("/api/v1/journal", json={"title": "A", "entry_date": HOJE.isoformat()}).json()
    client.delete(f"/api/v1/journal/{registro['id']}")
    assert "entries_1" in _conquistas(client)


def test_sequencia_de_estudos_e_conquista_de_ritmo(client):
    for atraso in (0, 1, 2):
        dia = (HOJE - timedelta(days=atraso)).isoformat()
        client.post("/api/v1/study-sessions", json={"study_date": dia, "duration_minutes": 10})
    estado = client.get(URL).json()
    assert estado["current_streak"] == 3
    assert estado["longest_streak"] == 3
    assert "streak_3" in _conquistas(client)


def test_xp_e_conquistas_sao_separados_por_usuario(client, other_client):
    client.post("/api/v1/journal", json={"title": "A", "entry_date": HOJE.isoformat()})
    assert _xp(other_client) == 0
    assert _conquistas(other_client) == set()
