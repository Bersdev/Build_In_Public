from datetime import date, timedelta

URL = "/api/v1/journal"
SESSOES = "/api/v1/study-sessions"


def _registro(**campos):
    return {"title": "Aprendi listas", "entry_date": "2026-01-10", **campos}


def test_criar_registro_com_todos_os_campos(client):
    resposta = client.post(
        URL,
        json=_registro(
            description="Estudei listas",
            duration_minutes=45,
            language="Python",
            technologies=["FastAPI", "fastapi", "SQL"],
            difficulties="Índices",
            errors="IndexError",
            solutions="Conferir o tamanho",
            key_learnings="Listas começam em zero",
            tags=["iniciante"],
            categories=["Backend"],
        ),
    )
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["duration_minutes"] == 45
    assert corpo["technologies"] == ["FastAPI", "SQL"]
    assert corpo["tags"] == ["iniciante"]
    assert corpo["categories"] == ["Backend"]
    assert corpo["errors"] == "IndexError"


def test_titulo_vazio_e_data_futura_sao_recusados(client):
    assert client.post(URL, json=_registro(title="   ")).status_code == 422
    futuro = (date.today() + timedelta(days=2)).isoformat()
    assert client.post(URL, json=_registro(entry_date=futuro)).status_code == 422


def test_editar_e_excluir_registro(client):
    registro = client.post(URL, json=_registro()).json()
    caminho = f"{URL}/{registro['id']}"
    editado = client.patch(caminho, json={"title": "Novo título", "tags": ["revisar"]}).json()
    assert editado["title"] == "Novo título"
    assert editado["tags"] == ["revisar"]
    assert client.delete(caminho).status_code == 204
    assert client.get(caminho).status_code == 404


def test_tempo_do_diario_vira_uma_unica_sessao_de_estudo(client):
    registro = client.post(URL, json=_registro(duration_minutes=45, technologies=["Python"])).json()
    client.post(SESSOES, json={"study_date": "2026-01-11", "duration_minutes": 30})

    sessoes = client.get(SESSOES).json()
    assert sorted(s["duration_minutes"] for s in sessoes) == [30, 45]
    ligada = next(s for s in sessoes if s["journal_entry_id"] == registro["id"])
    assert ligada["technology"] == "Python"
    assert ligada["study_date"] == "2026-01-10"


def test_alterar_o_tempo_atualiza_a_sessao_sem_duplicar(client):
    registro = client.post(URL, json=_registro(duration_minutes=45)).json()
    client.patch(f"{URL}/{registro['id']}", json={"duration_minutes": 60, "entry_date": "2026-01-09"})
    sessoes = client.get(SESSOES).json()
    assert len(sessoes) == 1
    assert sessoes[0]["duration_minutes"] == 60
    assert sessoes[0]["study_date"] == "2026-01-09"


def test_remover_o_tempo_apaga_a_sessao_ligada(client):
    registro = client.post(URL, json=_registro(duration_minutes=45)).json()
    corpo = client.patch(f"{URL}/{registro['id']}", json={"duration_minutes": None}).json()
    assert corpo["duration_minutes"] is None
    assert client.get(SESSOES).json() == []


def test_excluir_registro_apaga_a_sessao_ligada(client):
    registro = client.post(URL, json=_registro(duration_minutes=45)).json()
    client.delete(f"{URL}/{registro['id']}")
    assert client.get(SESSOES).json() == []


def test_excluir_sessao_mantem_o_registro_sem_tempo(client):
    registro = client.post(URL, json=_registro(duration_minutes=45)).json()
    sessao = client.get(SESSOES).json()[0]
    client.delete(f"{SESSOES}/{sessao['id']}")
    assert client.get(f"{URL}/{registro['id']}").json()["duration_minutes"] is None


def test_pesquisar_em_todos_os_campos_de_texto(client):
    client.post(URL, json=_registro(title="Listas", errors="IndexError estranho"))
    client.post(URL, json=_registro(title="Dicionários", key_learnings="chaves únicas"))
    assert [r["title"] for r in client.get(URL, params={"q": "indexerror"}).json()] == ["Listas"]
    assert [r["title"] for r in client.get(URL, params={"q": "CHAVES"}).json()] == ["Dicionários"]


def test_pesquisa_trata_curinga_como_texto_comum(client):
    client.post(URL, json=_registro(title="Sem porcentagem"))
    client.post(URL, json=_registro(title="100% concluído"))
    assert [r["title"] for r in client.get(URL, params={"q": "%"}).json()] == ["100% concluído"]


def test_filtrar_por_data_tecnologia_tag_e_categoria(client):
    client.post(URL, json=_registro(title="A", entry_date="2026-01-05", technologies=["Python"], tags=["t1"]))
    client.post(URL, json=_registro(title="B", entry_date="2026-03-05", technologies=["SQL"], categories=["Banco"]))

    def titulos(**filtros):
        return [r["title"] for r in client.get(URL, params=filtros).json()]

    assert titulos(date_from="2026-02-01") == ["B"]
    assert titulos(date_to="2026-02-01") == ["A"]
    assert titulos(technology="python") == ["A"]
    assert titulos(tag="t1") == ["A"]
    assert titulos(category="banco") == ["B"]


def test_historico_vem_do_mais_recente_para_o_mais_antigo(client):
    client.post(URL, json=_registro(title="Antigo", entry_date="2026-01-01"))
    client.post(URL, json=_registro(title="Recente", entry_date="2026-02-01"))
    assert [r["title"] for r in client.get(URL).json()] == ["Recente", "Antigo"]


def test_calendario_conta_registros_por_dia(client):
    client.post(URL, json=_registro(entry_date="2026-01-10"))
    client.post(URL, json=_registro(entry_date="2026-01-10"))
    client.post(URL, json=_registro(entry_date="2026-01-20"))
    client.post(URL, json=_registro(entry_date="2026-02-01"))
    calendario = client.get(f"{URL}/calendar", params={"year": 2026, "month": 1}).json()
    assert calendario == [{"date": "2026-01-10", "count": 2}, {"date": "2026-01-20", "count": 1}]


def test_registro_de_outro_usuario_e_invisivel(client, other_client):
    registro = client.post(URL, json=_registro(duration_minutes=30)).json()
    caminho = f"{URL}/{registro['id']}"
    assert other_client.get(URL).json() == []
    assert other_client.get(caminho).status_code == 404
    assert other_client.patch(caminho, json={"title": "x"}).status_code == 404
    assert other_client.delete(caminho).status_code == 404
    assert other_client.get(f"{URL}/calendar", params={"year": 2026, "month": 1}).json() == []
    assert other_client.get(SESSOES).json() == []


def test_tags_sao_separadas_por_usuario(client, other_client):
    client.post(URL, json=_registro(tags=["minha"]))
    other_client.post(URL, json=_registro(tags=["minha"]))
    assert len(client.get(URL, params={"tag": "minha"}).json()) == 1
