from datetime import timedelta

from app.core.dates import local_today

URL = "/api/v1/tasks"
HOJE = local_today("America/Sao_Paulo")


def _tarefa(client, **campos):
    resposta = client.post(URL, json={"title": "Tarefa", **campos})
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def test_criar_tarefa_com_valores_padrao(client):
    tarefa = _tarefa(client, description="Detalhes", category="Estudo", technology="Python")
    assert tarefa["status"] == "todo"
    assert tarefa["priority"] == "medium"
    assert tarefa["technology"] == "Python"
    assert tarefa["created_at"]


def test_validacoes_de_tarefa(client):
    assert client.post(URL, json={"title": " "}).status_code == 422
    assert client.post(URL, json={"title": "A", "status": "feito"}).status_code == 422
    assert client.post(URL, json={"title": "A", "priority": "urgente"}).status_code == 422


def test_concluir_e_reabrir_controla_a_data_de_conclusao(client):
    tarefa = _tarefa(client)
    concluida = client.patch(f"{URL}/{tarefa['id']}", json={"status": "done"}).json()
    assert concluida["completed_at"]
    reaberta = client.patch(f"{URL}/{tarefa['id']}", json={"status": "in_progress"}).json()
    assert reaberta["completed_at"] is None


def test_editar_e_excluir_tarefa(client):
    tarefa = _tarefa(client)
    caminho = f"{URL}/{tarefa['id']}"
    assert client.patch(caminho, json={"title": "Novo"}).json()["title"] == "Novo"
    assert client.delete(caminho).status_code == 204
    assert client.get(caminho).status_code == 404


def test_visualizacoes_por_prazo(client):
    ontem, amanha = HOJE - timedelta(days=1), HOJE + timedelta(days=1)
    _tarefa(client, title="Atrasada", due_date=ontem.isoformat())
    _tarefa(client, title="Hoje", due_date=HOJE.isoformat())
    _tarefa(client, title="Próxima", due_date=amanha.isoformat())
    _tarefa(client, title="Feita", due_date=ontem.isoformat(), status="done")
    _tarefa(client, title="Sem prazo")

    def titulos(view):
        return [t["title"] for t in client.get(URL, params={"view": view}).json()]

    assert titulos("overdue") == ["Atrasada"]
    assert titulos("today") == ["Hoje"]
    assert titulos("upcoming") == ["Próxima"]
    assert titulos("completed") == ["Feita"]
    assert len(titulos("all")) == 5


def test_tarefa_informa_se_esta_atrasada(client):
    ontem = (HOJE - timedelta(days=1)).isoformat()
    atrasada = _tarefa(client, due_date=ontem)
    feita = _tarefa(client, due_date=ontem, status="done")
    assert client.get(f"{URL}/{atrasada['id']}").json()["is_overdue"] is True
    por_id = {t["id"]: t for t in client.get(URL).json()}
    assert por_id[atrasada["id"]]["is_overdue"] is True
    assert por_id[feita["id"]]["is_overdue"] is False


def test_filtrar_por_status_e_projeto(client):
    projeto = client.post("/api/v1/projects", json={"name": "P"}).json()
    _tarefa(client, title="A", project_id=projeto["id"])
    _tarefa(client, title="B", status="in_progress")
    assert [t["title"] for t in client.get(URL, params={"status": "in_progress"}).json()] == ["B"]
    assert [t["title"] for t in client.get(URL, params={"project_id": projeto["id"]}).json()] == ["A"]


def test_tarefa_de_outro_usuario_e_invisivel(client, other_client):
    tarefa = _tarefa(client)
    caminho = f"{URL}/{tarefa['id']}"
    assert other_client.get(URL).json() == []
    assert other_client.get(caminho).status_code == 404
    assert other_client.patch(caminho, json={"status": "done"}).status_code == 404
    assert other_client.delete(caminho).status_code == 404
