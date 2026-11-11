"""Importação inteligente: a IA propõe um plano a partir do CSV; a pessoa revisa e aplica."""

import io
import json
import urllib.error

import pytest

from app.core import groq
from app.core.config import get_settings

IMPORTS = "/api/v1/imports"

CSV = "etapa,item\nFundamentos,Funções\nMeta,Estudar 10h por semana\n"

PLANO_DA_IA = {
    "roadmap": {
        "title": "Back-end com Python",
        "technology": "Python",
        "description": None,
        "stages": [
            {"title": "Fundamentos", "items": [{"title": "Funções", "url": None, "notes": None}]},
            {"title": "Web", "items": [{"title": "FastAPI", "url": "https://fastapi.tiangolo.com", "notes": None}]},
        ],
    },
    "goals": [
        {"title": "Estudar 10h por semana", "description": None, "kind": "weekly_study_hours", "target_value": 10, "due_date": None},
        {"title": "Meta inválida", "description": None, "kind": "manual", "target_value": 0, "due_date": None},
    ],
    "projects": [
        {"name": "API de tarefas", "description": "CRUD com FastAPI", "objective": None, "technologies": ["Python", "FastAPI"], "due_date": "2027-03-01"},
    ],
    "tasks": [
        {"title": "Criar repositório", "description": None, "priority": "high", "due_date": "2026-12-01", "project": "API de tarefas", "technology": None},
        {"title": "Data impossível", "description": None, "priority": "low", "due_date": "2026-13-45", "project": None, "technology": None},
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
        return PLANO_DA_IA

    monkeypatch.setattr(groq, "complete_json", completar)
    return chamadas


# ---------- estado da IA ----------


def test_status_da_ia_sem_chave(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "")
    assert client.get(f"{IMPORTS}/ai-status").json()["enabled"] is False


def test_status_da_ia_com_chave(client, com_chave):
    resposta = client.get(f"{IMPORTS}/ai-status").json()
    assert resposta["enabled"] is True
    assert "chave" not in json.dumps(resposta)


def test_analisar_exige_login(anonymous):
    assert anonymous.post(f"{IMPORTS}/analyze", json={"content": CSV}).status_code == 401


def test_analisar_sem_chave_explica_como_configurar(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "")
    resposta = client.post(f"{IMPORTS}/analyze", json={"content": CSV})
    assert resposta.status_code == 503
    assert "GROQ_API_KEY" in resposta.json()["detail"]


# ---------- análise ----------


def test_analisar_devolve_o_plano_sem_salvar_nada(client, ia_falsa):
    resposta = client.post(f"{IMPORTS}/analyze", json={"content": CSV})
    assert resposta.status_code == 200, resposta.text
    plano = resposta.json()["plan"]

    assert plano["roadmap"]["title"] == "Back-end com Python"
    assert [meta["title"] for meta in plano["goals"]] == ["Estudar 10h por semana"]
    assert [tarefa["title"] for tarefa in plano["tasks"]] == ["Criar repositório"]
    assert plano["projects"][0]["technologies"] == ["Python", "FastAPI"]

    avisos = resposta.json()["warnings"]
    assert any("Meta inválida" in aviso for aviso in avisos)
    assert any("Data impossível" in aviso for aviso in avisos)

    assert client.get("/api/v1/goals").json() == []
    assert client.get("/api/v1/learning-paths").json() == []


def test_analisar_envia_o_csv_e_a_data_de_hoje(client, ia_falsa):
    client.post(f"{IMPORTS}/analyze", json={"content": CSV})
    texto = json.dumps(ia_falsa[0]["messages"], ensure_ascii=False)
    assert "Estudar 10h por semana" in texto
    assert "Hoje é" in texto
    assert ia_falsa[0]["schema"]["additionalProperties"] is False


def test_analisar_limita_o_tamanho(client, ia_falsa):
    resposta = client.post(f"{IMPORTS}/analyze", json={"content": "x" * 60_001})
    assert resposta.status_code == 422


def test_falha_da_ia_vira_mensagem_clara(client, com_chave, monkeypatch):
    def falhar(messages, schema):
        raise groq.GroqError("A Groq recusou a chave. Confira GROQ_API_KEY.")

    monkeypatch.setattr(groq, "complete_json", falhar)
    resposta = client.post(f"{IMPORTS}/analyze", json={"content": CSV})
    assert resposta.status_code == 502
    assert "chave" in resposta.json()["detail"]


# ---------- aplicação ----------


def _plano_revisado(client, ia_falsa):
    return client.post(f"{IMPORTS}/analyze", json={"content": CSV}).json()["plan"]


def test_aplicar_cria_tudo_nas_paginas_certas(client, ia_falsa):
    plano = _plano_revisado(client, ia_falsa)
    resposta = client.post(f"{IMPORTS}/apply", json={"plan": plano})
    assert resposta.status_code == 201, resposta.text
    resumo = resposta.json()
    assert resumo["goals"] == 1 and resumo["tasks"] == 1 and resumo["projects"] == 1
    assert resumo["learning_path_id"] is not None

    trilha = client.get(f"/api/v1/learning-paths/{resumo['learning_path_id']}").json()
    assert [etapa["title"] for etapa in trilha["stages"]] == ["Fundamentos", "Web"]
    assert trilha["technology"] == "Python"

    meta = client.get("/api/v1/goals").json()[0]
    assert meta["kind"] == "weekly_study_hours"
    assert meta["current_value"] == 0  # progresso vem dos registros reais, nunca da IA

    projeto = client.get("/api/v1/projects").json()[0]
    assert projeto["status"] == "planning"
    assert sorted(projeto["technologies"]) == ["FastAPI", "Python"]

    tarefa = client.get("/api/v1/tasks").json()[0]
    assert tarefa["project_id"] == projeto["id"]
    assert tarefa["status"] == "todo"
    assert tarefa["due_date"] == "2026-12-01"


def test_aplicar_so_o_que_foi_mantido_na_revisao(client, ia_falsa):
    plano = _plano_revisado(client, ia_falsa)
    plano["roadmap"] = None
    plano["projects"] = []
    plano["tasks"][0]["project"] = None
    resposta = client.post(f"{IMPORTS}/apply", json={"plan": plano})
    assert resposta.status_code == 201, resposta.text
    assert client.get("/api/v1/learning-paths").json() == []
    assert client.get("/api/v1/projects").json() == []
    assert len(client.get("/api/v1/tasks").json()) == 1


def test_aplicar_e_tudo_ou_nada(client, ia_falsa):
    plano = _plano_revisado(client, ia_falsa)
    plano["tasks"][0]["project"] = "Projeto que não existe no plano"
    resposta = client.post(f"{IMPORTS}/apply", json={"plan": plano})
    assert resposta.status_code == 422
    assert client.get("/api/v1/goals").json() == []
    assert client.get("/api/v1/learning-paths").json() == []
    assert client.get("/api/v1/projects").json() == []


def test_aplicar_plano_vazio_e_recusado(client):
    vazio = {"roadmap": None, "goals": [], "tasks": [], "projects": []}
    assert client.post(f"{IMPORTS}/apply", json={"plan": vazio}).status_code == 422


def test_aplicar_valida_os_campos(client):
    plano = {"roadmap": None, "goals": [{"title": "X", "description": None, "kind": "manual", "target_value": -1, "due_date": None}], "tasks": [], "projects": []}
    assert client.post(f"{IMPORTS}/apply", json={"plan": plano}).status_code == 422


def test_dados_aplicados_sao_so_de_quem_importou(client, other_client, ia_falsa):
    plano = _plano_revisado(client, ia_falsa)
    client.post(f"{IMPORTS}/apply", json={"plan": plano})
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
    resultado = groq.complete_json([{"role": "user", "content": "oi"}], {"type": "object"})

    assert resultado == {"ok": True}
    assert enviado["url"].endswith("/chat/completions")
    assert enviado["auth"] == "Bearer chave-de-teste"
    assert enviado["body"]["response_format"]["json_schema"]["strict"] is True


def test_cliente_traduz_chave_recusada(monkeypatch, com_chave):
    def abrir(request, timeout):
        raise urllib.error.HTTPError(request.full_url, 401, "Unauthorized", {}, io.BytesIO(b"{}"))

    monkeypatch.setattr(groq.urllib.request, "urlopen", abrir)
    with pytest.raises(groq.GroqError, match="chave"):
        groq.complete_json([{"role": "user", "content": "oi"}], {"type": "object"})


def test_cliente_traduz_limite_de_uso(monkeypatch, com_chave):
    def abrir(request, timeout):
        raise urllib.error.HTTPError(request.full_url, 429, "Too Many Requests", {}, io.BytesIO(b"{}"))

    monkeypatch.setattr(groq.urllib.request, "urlopen", abrir)
    with pytest.raises(groq.GroqError, match="limite"):
        groq.complete_json([{"role": "user", "content": "oi"}], {"type": "object"})
