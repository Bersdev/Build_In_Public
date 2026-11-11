"""Importação inteligente: a IA classifica as linhas do CSV; a pessoa revisa e aplica.

A IA não reescreve a trilha. Ela diz quais colunas são título, etapa, link e notas, e quais
linhas são metas, projetos ou tarefas. Todo o resto vira conteúdo da trilha, tirado do próprio
arquivo. Arquivos grandes são analisados em partes, para caber no limite de tokens da Groq.
"""

import io
import json
import urllib.error

import pytest

from app.core import groq
from app.core.config import get_settings
from app.modules.imports import service

IMPORTS = "/api/v1/imports"

CSV = """etapa,item,link,observação
Fundamentos,Funções,https://docs.python.org,Revisar escopo
Meta,Estudar 10h por semana,,
Web,FastAPI,javascript:alert(1),
Projeto,API de tarefas com FastAPI,,
Tarefa,Criar repositório,,urgente
Tarefa,Data impossível,,
Meta,Meta inválida,,
etapa,item,link,observação
"""

RESPOSTA_DA_IA = {
    "columns": {"title": 1, "stage": 0, "url": 2, "notes": 3},
    "roadmap_title": "Back-end com Python",
    "technology": "Python",
    "goals": [
        {"row": 1, "title": "Estudar 10h por semana", "kind": "weekly_study_hours", "target_value": 10, "due_date": None},
        {"row": 6, "title": "Meta inválida", "kind": "manual", "target_value": 0, "due_date": None},
    ],
    "projects": [
        {"row": 3, "name": "API de tarefas", "description": "CRUD com FastAPI", "technologies": ["Python", "FastAPI"], "due_date": "2027-03-01"},
    ],
    "tasks": [
        {"row": 4, "title": "Criar repositório", "priority": "high", "due_date": "2026-12-01", "project": "API de tarefas"},
        {"row": 5, "title": "Data impossível", "priority": "low", "due_date": "2026-13-45", "project": None},
        {"row": 999, "title": "Linha que não existe", "priority": "low", "due_date": None, "project": None},
    ],
}


@pytest.fixture
def com_chave(monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "chave-de-teste")


@pytest.fixture
def ia_falsa(monkeypatch, com_chave):
    chamadas = []

    def completar(messages, schema):
        chamadas.append({"messages": messages, "schema": schema})
        return RESPOSTA_DA_IA

    monkeypatch.setattr(groq, "complete_json", completar)
    return chamadas


def _analisar(client, conteudo=CSV, **campos):
    return client.post(f"{IMPORTS}/analyze", json={"content": conteudo, **campos})


# ---------- estado e configuração ----------


def test_status_da_ia_sem_chave(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "")
    assert client.get(f"{IMPORTS}/ai-status").json()["enabled"] is False


def test_status_da_ia_com_chave_nao_expoe_a_chave(client, com_chave):
    resposta = client.get(f"{IMPORTS}/ai-status").json()
    assert resposta == {"enabled": True}


def test_analisar_exige_login(anonymous):
    assert anonymous.post(f"{IMPORTS}/analyze", json={"content": CSV}).status_code == 401


def test_analisar_sem_chave_explica_como_configurar(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "")
    resposta = _analisar(client)
    assert resposta.status_code == 503
    assert "GROQ_API_KEY" in resposta.json()["detail"]


# ---------- classificação ----------


def test_linhas_classificadas_viram_metas_projetos_e_tarefas(client, ia_falsa):
    resposta = _analisar(client)
    assert resposta.status_code == 200, resposta.text
    corpo = resposta.json()
    plano = corpo["plan"]

    assert [meta["title"] for meta in plano["goals"]] == ["Estudar 10h por semana"]
    assert plano["goals"][0]["kind"] == "weekly_study_hours"
    assert [projeto["name"] for projeto in plano["projects"]] == ["API de tarefas"]
    assert [tarefa["title"] for tarefa in plano["tasks"]] == ["Criar repositório"]
    assert plano["tasks"][0]["project"] == "API de tarefas"
    assert corpo["next_row"] is None
    assert corpo["total_rows"] == 8


def test_o_resto_vira_trilha_com_texto_do_proprio_arquivo(client, ia_falsa):
    trilha = _analisar(client).json()["plan"]["roadmap"]
    assert trilha["title"] == "Back-end com Python"
    assert trilha["technology"] == "Python"
    assert [etapa["title"] for etapa in trilha["stages"]] == ["Fundamentos", "Web"]
    funcoes = trilha["stages"][0]["items"][0]
    assert funcoes == {"title": "Funções", "url": "https://docs.python.org", "notes": "Revisar escopo"}
    # Link perigoso é descartado, mas o conteúdo fica.
    assert trilha["stages"][1]["items"][0] == {"title": "FastAPI", "url": None, "notes": None}


def test_itens_invalidos_ficam_de_fora_com_aviso_da_linha(client, ia_falsa):
    corpo = _analisar(client).json()
    avisos = " ".join(corpo["warnings"])
    assert "Linha 8" in avisos and "Meta inválida" in avisos
    assert "Linha 7" in avisos and "Data impossível" in avisos
    titulos = [item["title"] for etapa in corpo["plan"]["roadmap"]["stages"] for item in etapa["items"]]
    assert "Meta inválida" not in titulos and "Data impossível" not in titulos and "item" not in titulos


def test_ia_nao_decide_ignorar_linhas(client, com_chave, monkeypatch):
    # Na produção, a IA chegou a marcar uma parte inteira como "ignorar". Agora ela não tem essa opção:
    # toda linha não classificada vira conteúdo, e só repetições exatas do cabeçalho são puladas.
    def completar(messages, schema):
        assert "ignore_rows" not in schema["properties"]
        return {**RESPOSTA_DA_IA, "ignore_rows": [0, 2]}

    monkeypatch.setattr(groq, "complete_json", completar)
    titulos = [i["title"] for e in _analisar(client).json()["plan"]["roadmap"]["stages"] for i in e["items"]]
    assert titulos == ["Funções", "FastAPI"]


def test_partes_seguintes_nao_pedem_colunas_nulas(client, ia_falsa):
    colunas = {"title": 1, "stage": 0, "url": 2, "notes": 3}
    _analisar(client, columns=colunas)
    assert "null" not in ia_falsa[0]["messages"][-1]["content"]


def test_pedido_a_ia_tem_linhas_numeradas_data_de_hoje_e_schema_estrito(client, ia_falsa):
    _analisar(client)
    texto = json.dumps(ia_falsa[0]["messages"], ensure_ascii=False)
    assert "#0" in texto and "Funções" in texto
    assert "Hoje é" in texto
    assert ia_falsa[0]["schema"]["additionalProperties"] is False


def test_nada_e_salvo_na_analise(client, ia_falsa):
    _analisar(client)
    for rota in ("goals", "tasks", "projects", "learning-paths"):
        assert client.get(f"/api/v1/{rota}").json() == []


# ---------- arquivos grandes ----------


def _csv_grande(linhas=300):
    corpo = "\n".join(f"Etapa {n // 50},Tópico {n} com uma descrição comprida o bastante para ocupar espaço,,nota {n}" for n in range(linhas))
    return f"etapa,item,link,notas\n{corpo}\n"


def test_arquivo_grande_e_analisado_em_partes(client, com_chave, monkeypatch):
    linhas_por_chamada = []

    def completar(messages, schema):
        texto = messages[-1]["content"]
        linhas_por_chamada.append([linha for linha in texto.splitlines() if linha.startswith("#")])
        return {"columns": {"title": 1, "stage": 0, "url": None, "notes": 3}, "roadmap_title": None, "technology": None,
                "goals": [], "projects": [], "tasks": []}

    monkeypatch.setattr(groq, "complete_json", completar)
    conteudo = _csv_grande()

    primeira = _analisar(client, conteudo).json()
    assert primeira["next_row"] is not None and 0 < primeira["next_row"] < 300
    assert primeira["total_rows"] == 300

    segunda = _analisar(client, conteudo, start_row=primeira["next_row"], columns=primeira["columns"], stage=primeira["stage"]).json()
    assert segunda["plan"]["roadmap"]["stages"][0]["items"][0]["title"].startswith(f"Tópico {primeira['next_row']} ")
    assert linhas_por_chamada[1][0].startswith(f"#{primeira['next_row']} ")
    # Cada parte cabe no limite de tokens por minuto do plano gratuito da Groq (8 mil).
    assert all(len("\n".join(linhas)) <= service.CHUNK_CHAR_BUDGET for linhas in linhas_por_chamada)


def test_partes_seguintes_usam_as_colunas_ja_definidas(client, com_chave, monkeypatch):
    def completar(messages, schema):
        return {"columns": {"title": 3, "stage": None, "url": None, "notes": None}, "roadmap_title": None, "technology": None,
                "goals": [], "projects": [], "tasks": []}

    monkeypatch.setattr(groq, "complete_json", completar)
    colunas = {"title": 1, "stage": 0, "url": None, "notes": None}
    corpo = _analisar(client, _csv_grande(10), columns=colunas).json()
    assert corpo["columns"] == colunas
    assert corpo["plan"]["roadmap"]["stages"][0]["items"][0]["title"] == "Tópico 0 com uma descrição comprida o bastante para ocupar espaço"


def test_inicio_alem_do_fim_e_recusado(client, ia_falsa):
    assert _analisar(client, start_row=500).status_code == 422


# ---------- falhas da Groq ----------


def test_falha_da_ia_vira_mensagem_clara(client, com_chave, monkeypatch):
    def falhar(messages, schema):
        raise groq.GroqError("A Groq recusou a chave. Confira GROQ_API_KEY.")

    monkeypatch.setattr(groq, "complete_json", falhar)
    resposta = _analisar(client)
    assert resposta.status_code == 502
    assert "chave" in resposta.json()["detail"]


def test_limite_por_minuto_devolve_429_com_tempo_de_espera(client, com_chave, monkeypatch):
    def limitar(messages, schema):
        raise groq.GroqRateLimited("Limite da Groq.", retry_after=17)

    monkeypatch.setattr(groq, "complete_json", limitar)
    resposta = _analisar(client)
    assert resposta.status_code == 429
    assert resposta.json()["retry_after"] == 17


# ---------- aplicação ----------


def _plano(client):
    return _analisar(client).json()["plan"]


def test_aplicar_cria_tudo_nas_paginas_certas(client, ia_falsa):
    resposta = client.post(f"{IMPORTS}/apply", json={"plan": _plano(client)})
    assert resposta.status_code == 201, resposta.text
    resumo = resposta.json()
    assert (resumo["goals"], resumo["tasks"], resumo["projects"]) == (1, 1, 1)

    trilha = client.get(f"/api/v1/learning-paths/{resumo['learning_path_id']}").json()
    assert [etapa["title"] for etapa in trilha["stages"]] == ["Fundamentos", "Web"]

    meta = client.get("/api/v1/goals").json()[0]
    assert meta["kind"] == "weekly_study_hours"
    assert meta["current_value"] == 0  # progresso vem dos registros reais, nunca da IA

    projeto = client.get("/api/v1/projects").json()[0]
    assert projeto["status"] == "planning"
    assert sorted(projeto["technologies"]) == ["FastAPI", "Python"]

    tarefa = client.get("/api/v1/tasks").json()[0]
    assert tarefa["project_id"] == projeto["id"]
    assert (tarefa["status"], tarefa["priority"], tarefa["due_date"]) == ("todo", "high", "2026-12-01")


def test_aplicar_so_o_que_foi_mantido_na_revisao(client, ia_falsa):
    plano = _plano(client)
    plano["roadmap"] = None
    plano["projects"] = []
    plano["tasks"][0]["project"] = None
    assert client.post(f"{IMPORTS}/apply", json={"plan": plano}).status_code == 201
    assert client.get("/api/v1/learning-paths").json() == []
    assert client.get("/api/v1/projects").json() == []
    assert len(client.get("/api/v1/tasks").json()) == 1


def test_aplicar_e_tudo_ou_nada(client, ia_falsa):
    plano = _plano(client)
    plano["tasks"][0]["project"] = "Projeto que não existe no plano"
    assert client.post(f"{IMPORTS}/apply", json={"plan": plano}).status_code == 422
    for rota in ("goals", "projects", "learning-paths"):
        assert client.get(f"/api/v1/{rota}").json() == []


def test_aplicar_plano_semanal_de_um_ano(client):
    # Um plano por semana tem 52 etapas: precisa caber.
    etapas = [{"title": f"Semana {n}", "items": [{"title": f"Tema {n}", "url": None, "notes": None}]} for n in range(1, 53)]
    plano = {"roadmap": {"title": "Ano de estudos", "technology": None, "description": None, "stages": etapas},
             "goals": [], "tasks": [], "projects": []}
    resposta = client.post(f"{IMPORTS}/apply", json={"plan": plano})
    assert resposta.status_code == 201, resposta.text
    trilha = client.get(f"/api/v1/learning-paths/{resposta.json()['learning_path_id']}").json()
    assert len(trilha["stages"]) == 52


def test_prompt_prefere_o_agrupamento_mais_amplo(client, ia_falsa):
    _analisar(client)
    assert "mais ampla" in ia_falsa[0]["messages"][0]["content"]


def test_aplicar_plano_vazio_e_recusado(client):
    vazio = {"roadmap": None, "goals": [], "tasks": [], "projects": []}
    assert client.post(f"{IMPORTS}/apply", json={"plan": vazio}).status_code == 422


def test_aplicar_valida_os_campos(client):
    meta = {"title": "X", "description": None, "kind": "manual", "target_value": -1, "due_date": None}
    plano = {"roadmap": None, "goals": [meta], "tasks": [], "projects": []}
    assert client.post(f"{IMPORTS}/apply", json={"plan": plano}).status_code == 422


def test_dados_aplicados_sao_so_de_quem_importou(client, other_client, ia_falsa):
    client.post(f"{IMPORTS}/apply", json={"plan": _plano(client)})
    for rota in ("goals", "tasks", "projects", "learning-paths"):
        assert other_client.get(f"/api/v1/{rota}").json() == []


# ---------- cliente da Groq ----------


class _Resposta(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def test_cliente_monta_o_pedido_e_le_a_resposta(monkeypatch, com_chave):
    enviado = {}

    def abrir(request, timeout):
        enviado["url"] = request.full_url
        enviado["auth"] = request.get_header("Authorization")
        enviado["body"] = json.loads(request.data)
        corpo = {"choices": [{"message": {"content": json.dumps({"ok": True})}}]}
        return _Resposta(json.dumps(corpo).encode())

    monkeypatch.setattr(groq.urllib.request, "urlopen", abrir)
    assert groq.complete_json([{"role": "user", "content": "oi"}], {"type": "object"}) == {"ok": True}
    assert enviado["url"].endswith("/chat/completions")
    assert enviado["auth"] == "Bearer chave-de-teste"
    assert enviado["body"]["response_format"]["json_schema"]["strict"] is True
    # Resposta pequena: cabe, junto com a parte do CSV, no limite de 8 mil tokens por minuto.
    assert enviado["body"]["max_completion_tokens"] <= 4_000


def _http_error(code, headers=None):
    def abrir(request, timeout):
        raise urllib.error.HTTPError(request.full_url, code, "erro", headers or {}, io.BytesIO(b"{}"))

    return abrir


def test_cliente_traduz_chave_recusada(monkeypatch, com_chave):
    monkeypatch.setattr(groq.urllib.request, "urlopen", _http_error(401))
    with pytest.raises(groq.GroqError, match="chave"):
        groq.complete_json([{"role": "user", "content": "oi"}], {"type": "object"})


def test_cliente_traduz_limite_com_tempo_de_espera(monkeypatch, com_chave):
    monkeypatch.setattr(groq.urllib.request, "urlopen", _http_error(429, {"retry-after": "9"}))
    with pytest.raises(groq.GroqRateLimited) as erro:
        groq.complete_json([{"role": "user", "content": "oi"}], {"type": "object"})
    assert erro.value.retry_after == 9


def test_cliente_explica_pedido_grande_demais(monkeypatch, com_chave):
    # 413: o pedido sozinho passa do limite por minuto; esperar não resolve.
    monkeypatch.setattr(groq.urllib.request, "urlopen", _http_error(413))
    with pytest.raises(groq.GroqError, match="grande demais") as erro:
        groq.complete_json([{"role": "user", "content": "oi"}], {"type": "object"})
    assert not isinstance(erro.value, groq.GroqRateLimited)
