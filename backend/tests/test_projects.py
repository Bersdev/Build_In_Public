URL = "/api/v1/projects"


def _projeto(client, **campos):
    resposta = client.post(URL, json={"name": "Build in Public", **campos})
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def test_criar_projeto_com_valores_padrao_e_tecnologias(client):
    projeto = _projeto(
        client,
        description="Plataforma",
        objective="Aprender",
        technologies=["Python", "React"],
        github_url="https://github.com/exemplo/repo",
        demo_url="https://exemplo.com",
    )
    assert projeto["status"] == "planning"
    assert projeto["priority"] == "medium"
    assert projeto["progress_percent"] == 0
    assert projeto["technologies"] == ["Python", "React"]


def test_validacoes_de_projeto(client):
    assert client.post(URL, json={"name": ""}).status_code == 422
    assert client.post(URL, json={"name": "A", "status": "inexistente"}).status_code == 422
    assert client.post(URL, json={"name": "A", "progress_percent": 101}).status_code == 422
    assert client.post(URL, json={"name": "A", "github_url": "javascript:alert(1)"}).status_code == 422
    fora_de_ordem = {"name": "A", "start_date": "2026-02-01", "due_date": "2026-01-01"}
    assert client.post(URL, json=fora_de_ordem).status_code == 422


def test_prazo_nao_pode_ficar_antes_do_inicio_ao_editar(client):
    projeto = _projeto(client, start_date="2026-02-01")
    assert client.patch(f"{URL}/{projeto['id']}", json={"due_date": "2026-01-01"}).status_code == 422


def test_editar_excluir_e_filtrar_por_status(client):
    a = _projeto(client, name="A", status="in_progress")
    b = _projeto(client, name="B")
    assert [p["name"] for p in client.get(URL, params={"status": "in_progress"}).json()] == ["A"]
    assert client.patch(f"{URL}/{b['id']}", json={"priority": "high"}).json()["priority"] == "high"
    assert client.delete(f"{URL}/{a['id']}").status_code == 204
    assert client.get(f"{URL}/{a['id']}").status_code == 404


def test_mudanca_de_status_fica_no_historico(client):
    projeto = _projeto(client)
    client.patch(f"{URL}/{projeto['id']}", json={"status": "in_progress"})
    client.post(f"{URL}/{projeto['id']}/updates", json={"content": "Primeira versão no ar"})
    atualizacoes = client.get(f"{URL}/{projeto['id']}").json()["updates"]
    assert [u["kind"] for u in atualizacoes] == ["note", "status"]
    assert atualizacoes[0]["content"] == "Primeira versão no ar"


def test_concluir_projeto_define_data_e_cem_por_cento(client):
    projeto = _projeto(client, progress_percent=40)
    concluido = client.patch(f"{URL}/{projeto['id']}", json={"status": "completed"}).json()
    assert concluido["progress_percent"] == 100
    assert concluido["completed_at"]
    reaberto = client.patch(f"{URL}/{projeto['id']}", json={"status": "in_progress"}).json()
    assert reaberto["completed_at"] is None


def test_pagina_do_projeto_reune_tarefas_diario_e_contagens(client):
    projeto = _projeto(client)
    client.post("/api/v1/tasks", json={"title": "T1", "project_id": projeto["id"], "status": "done"})
    client.post("/api/v1/tasks", json={"title": "T2", "project_id": projeto["id"]})
    client.post("/api/v1/journal", json={"title": "R1", "entry_date": "2026-01-10", "project_id": projeto["id"]})

    detalhe = client.get(f"{URL}/{projeto['id']}").json()
    assert [t["title"] for t in detalhe["tasks"]] == ["T1", "T2"]
    assert [r["title"] for r in detalhe["journal_entries"]] == ["R1"]
    assert detalhe["tasks_total"] == 2
    assert detalhe["tasks_done"] == 1


def test_excluir_projeto_mantem_tarefas_e_registros(client):
    projeto = _projeto(client)
    tarefa = client.post("/api/v1/tasks", json={"title": "T", "project_id": projeto["id"]}).json()
    client.delete(f"{URL}/{projeto['id']}")
    assert client.get(f"/api/v1/tasks/{tarefa['id']}").json()["project_id"] is None


def test_projeto_de_outro_usuario_e_invisivel(client, other_client):
    projeto = _projeto(client)
    caminho = f"{URL}/{projeto['id']}"
    assert other_client.get(URL).json() == []
    assert other_client.get(caminho).status_code == 404
    assert other_client.patch(caminho, json={"name": "x"}).status_code == 404
    assert other_client.delete(caminho).status_code == 404
    assert other_client.post(f"{caminho}/updates", json={"content": "x"}).status_code == 404


def test_nao_vincula_registro_ou_tarefa_a_projeto_de_outro_usuario(client, other_client):
    projeto = _projeto(client)
    diario = {"title": "R", "entry_date": "2026-01-10", "project_id": projeto["id"]}
    assert other_client.post("/api/v1/journal", json=diario).status_code == 404
    assert other_client.post("/api/v1/tasks", json={"title": "T", "project_id": projeto["id"]}).status_code == 404
