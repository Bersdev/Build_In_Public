PATHS = "/api/v1/learning-paths"
STAGES = "/api/v1/learning-stages"
ITEMS = "/api/v1/learning-items"
COURSES = "/api/v1/courses"


def _trilha(client):
    trilha = client.post(
        PATHS, json={"title": "Python", "technology": "Python", "start_date": "2026-01-01", "target_date": "2026-06-01"}
    )
    assert trilha.status_code == 201, trilha.text
    return trilha.json()


def _etapa(client, trilha_id, titulo="Fundamentos"):
    resposta = client.post(f"{PATHS}/{trilha_id}/stages", json={"title": titulo})
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def _conteudo(client, etapa_id, **campos):
    resposta = client.post(f"{STAGES}/{etapa_id}/items", json={"title": "Listas", **campos})
    assert resposta.status_code == 201, resposta.text
    return resposta.json()


def test_montar_trilha_com_etapas_e_conteudos(client):
    trilha = _trilha(client)
    etapa = _etapa(client, trilha["id"])
    _conteudo(client, etapa["id"], url="https://docs.python.org")

    detalhe = client.get(f"{PATHS}/{trilha['id']}").json()
    assert detalhe["technology"] == "Python"
    assert detalhe["stages"][0]["title"] == "Fundamentos"
    assert detalhe["stages"][0]["items"][0]["url"] == "https://docs.python.org"


def test_progresso_e_calculado_pelos_conteudos_concluidos(client):
    trilha = _trilha(client)
    etapa = _etapa(client, trilha["id"])
    primeiro = _conteudo(client, etapa["id"])
    _conteudo(client, etapa["id"], title="Dicionários")
    assert client.get(f"{PATHS}/{trilha['id']}").json()["progress_percent"] == 0

    assert client.patch(f"{ITEMS}/{primeiro['id']}", json={"completed": True}).json()["completed_at"]
    assert client.get(f"{PATHS}/{trilha['id']}").json()["progress_percent"] == 50

    assert client.patch(f"{ITEMS}/{primeiro['id']}", json={"completed": False}).json()["completed_at"] is None
    assert client.get(PATHS).json()[0]["progress_percent"] == 0


def test_validacoes_de_trilha(client):
    assert client.post(PATHS, json={"title": ""}).status_code == 422
    fora_de_ordem = {"title": "A", "start_date": "2026-02-01", "target_date": "2026-01-01"}
    assert client.post(PATHS, json=fora_de_ordem).status_code == 422
    etapa = _etapa(client, _trilha(client)["id"])
    assert client.post(f"{STAGES}/{etapa['id']}/items", json={"title": "A", "url": "ftp://x"}).status_code == 422


def test_editar_e_excluir_etapas_e_trilhas(client):
    trilha = _trilha(client)
    etapa = _etapa(client, trilha["id"])
    conteudo = _conteudo(client, etapa["id"])
    assert client.patch(f"{STAGES}/{etapa['id']}", json={"title": "Base"}).json()["title"] == "Base"
    assert client.patch(f"{ITEMS}/{conteudo['id']}", json={"title": "Tuplas"}).json()["title"] == "Tuplas"
    assert client.delete(f"{ITEMS}/{conteudo['id']}").status_code == 204
    assert client.delete(f"{STAGES}/{etapa['id']}").status_code == 204
    assert client.patch(f"{PATHS}/{trilha['id']}", json={"title": "Novo"}).json()["title"] == "Novo"
    assert client.delete(f"{PATHS}/{trilha['id']}").status_code == 204
    assert client.get(PATHS).json() == []


def test_associar_curso_ao_conteudo(client):
    curso = client.post(COURSES, json={"title": "Python FIAP", "provider": "FIAP"}).json()
    etapa = _etapa(client, _trilha(client)["id"])
    conteudo = _conteudo(client, etapa["id"], course_id=curso["id"])
    assert conteudo["course_title"] == "Python FIAP"


def test_crud_de_cursos_e_conclusao(client):
    curso = client.post(COURSES, json={"title": "SQL", "url": "https://exemplo.com/sql"})
    assert curso.status_code == 201
    corpo = curso.json()
    assert corpo["status"] == "planned"
    concluido = client.patch(f"{COURSES}/{corpo['id']}", json={"status": "completed"}).json()
    assert concluido["completed_at"]
    assert client.patch(f"{COURSES}/{corpo['id']}", json={"status": "in_progress"}).json()["completed_at"] is None
    assert client.post(COURSES, json={"title": "X", "url": "javascript:alert(1)"}).status_code == 422
    assert client.delete(f"{COURSES}/{corpo['id']}").status_code == 204
    assert client.get(COURSES).json() == []


def test_dados_de_outro_usuario_sao_invisiveis(client, other_client):
    trilha = _trilha(client)
    etapa = _etapa(client, trilha["id"])
    conteudo = _conteudo(client, etapa["id"])
    curso = client.post(COURSES, json={"title": "SQL"}).json()

    assert other_client.get(PATHS).json() == []
    assert other_client.get(COURSES).json() == []
    assert other_client.get(f"{PATHS}/{trilha['id']}").status_code == 404
    assert other_client.post(f"{PATHS}/{trilha['id']}/stages", json={"title": "x"}).status_code == 404
    assert other_client.patch(f"{STAGES}/{etapa['id']}", json={"title": "x"}).status_code == 404
    assert other_client.post(f"{STAGES}/{etapa['id']}/items", json={"title": "x"}).status_code == 404
    assert other_client.patch(f"{ITEMS}/{conteudo['id']}", json={"completed": True}).status_code == 404
    assert other_client.delete(f"{ITEMS}/{conteudo['id']}").status_code == 404
    assert other_client.patch(f"{COURSES}/{curso['id']}", json={"title": "x"}).status_code == 404


def test_nao_associa_curso_de_outro_usuario(client, other_client):
    curso = client.post(COURSES, json={"title": "SQL"}).json()
    trilha_outro = other_client.post(PATHS, json={"title": "T"}).json()
    etapa = other_client.post(f"{PATHS}/{trilha_outro['id']}/stages", json={"title": "E"}).json()
    resposta = other_client.post(f"{STAGES}/{etapa['id']}/items", json={"title": "C", "course_id": curso["id"]})
    assert resposta.status_code == 404
