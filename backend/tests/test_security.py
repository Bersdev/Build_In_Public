"""Varreduras de segurança: acesso entre contas, referências cruzadas e entradas hostis."""

import pytest

from tests.conftest import PASSWORD

API = "/api/v1"


@pytest.fixture
def dados_da_ana(client):
    """A Ana cria um registro de cada tipo. Os IDs de cada tabela começam em 1."""
    criados = {
        "sessao": client.post(f"{API}/study-sessions", json={"study_date": "2026-11-01", "duration_minutes": 30}),
        "diario": client.post(f"{API}/journal", json={"title": "Segredo da Ana", "entry_date": "2026-11-01"}),
        "projeto": client.post(f"{API}/projects", json={"name": "Projeto da Ana"}),
        "tarefa": client.post(f"{API}/tasks", json={"title": "Tarefa da Ana"}),
        "curso": client.post(f"{API}/courses", json={"title": "Curso da Ana"}),
        "trilha": client.post(f"{API}/learning-paths", json={"title": "Trilha da Ana"}),
        "meta": client.post(f"{API}/goals", json={"title": "Meta da Ana", "target_value": 5}),
    }
    for nome, resposta in criados.items():
        assert resposta.status_code == 201, (nome, resposta.text)
    trilha = criados["trilha"].json()["id"]
    etapa = client.post(f"{API}/learning-paths/{trilha}/stages", json={"title": "Etapa"})
    assert etapa.status_code == 201, etapa.text
    item = client.post(f"{API}/learning-stages/{etapa.json()['id']}/items", json={"title": "Item"})
    assert item.status_code == 201, item.text
    atualizacao = client.post(f"{API}/projects/{criados['projeto'].json()['id']}/updates", json={"content": "x"})
    assert atualizacao.status_code == 201, atualizacao.text
    return {nome: r.json()["id"] for nome, r in criados.items()}


# Toda rota com ID na URL, chamada pela Bia com os IDs da Ana (todos valem 1).
ROTAS_COM_ID = [
    ("GET", "/study-sessions/1"), ("PATCH", "/study-sessions/1"), ("DELETE", "/study-sessions/1"),
    ("GET", "/journal/1"), ("PATCH", "/journal/1"), ("DELETE", "/journal/1"),
    ("GET", "/projects/1"), ("PATCH", "/projects/1"), ("DELETE", "/projects/1"),
    ("POST", "/projects/1/updates"),
    ("GET", "/tasks/1"), ("PATCH", "/tasks/1"), ("DELETE", "/tasks/1"),
    ("PATCH", "/courses/1"), ("DELETE", "/courses/1"),
    ("GET", "/learning-paths/1"), ("PATCH", "/learning-paths/1"), ("DELETE", "/learning-paths/1"),
    ("POST", "/learning-paths/1/stages"),
    ("PATCH", "/learning-stages/1"), ("DELETE", "/learning-stages/1"),
    ("POST", "/learning-stages/1/items"),
    ("PATCH", "/learning-items/1"), ("DELETE", "/learning-items/1"),
    ("GET", "/goals/1"), ("PATCH", "/goals/1"), ("DELETE", "/goals/1"),
]


@pytest.mark.parametrize("metodo,caminho", ROTAS_COM_ID)
def test_bia_nao_enxerga_nem_altera_nada_da_ana(other_client, dados_da_ana, metodo, caminho):
    corpo = {"title": "invadido", "name": "invadido", "content": "invadido", "target_value": 1}
    resposta = other_client.request(metodo, f"{API}{caminho}", json=corpo if metodo != "GET" else None)
    assert resposta.status_code == 404, f"{metodo} {caminho} -> {resposta.status_code}: {resposta.text[:120]}"


def test_depois_da_varredura_os_dados_da_ana_continuam_intactos(client, other_client, dados_da_ana):
    for metodo, caminho in ROTAS_COM_ID:
        other_client.request(metodo, f"{API}{caminho}", json={"title": "x", "name": "x", "content": "x", "target_value": 1})
    assert client.get(f"{API}/journal/1").json()["title"] == "Segredo da Ana"
    assert client.get(f"{API}/projects/1").json()["name"] == "Projeto da Ana"
    assert client.get(f"{API}/goals/1").json()["title"] == "Meta da Ana"
    assert client.get(f"{API}/learning-paths/1").status_code == 200


def test_listagens_da_bia_nao_trazem_nada_da_ana(other_client, dados_da_ana):
    for rota in ("study-sessions", "journal", "projects", "tasks", "learning-paths", "goals", "courses"):
        resposta = other_client.get(f"{API}/{rota}")
        assert resposta.status_code == 200, rota
        assert resposta.json() == [] or resposta.json().get("items") == [], (rota, resposta.text[:150])


# ---------- referências cruzadas na atualização (PATCH) ----------


def test_bia_nao_aponta_registros_dela_para_projeto_ou_curso_da_ana(other_client, dados_da_ana):
    diario = other_client.post(f"{API}/journal", json={"title": "Meu", "entry_date": "2026-11-02"}).json()
    tarefa = other_client.post(f"{API}/tasks", json={"title": "Minha"}).json()
    trilha = other_client.post(f"{API}/learning-paths", json={"title": "Minha trilha"}).json()
    etapa = other_client.post(f"{API}/learning-paths/{trilha['id']}/stages", json={"title": "E"}).json()
    item = other_client.post(f"{API}/learning-stages/{etapa['id']}/items", json={"title": "I"}).json()
    # A Bia tem o registro nº 1 de cada tabela? Não: os IDs dela vêm depois dos da Ana.
    projeto_da_ana, curso_da_ana = dados_da_ana["projeto"], dados_da_ana["curso"]
    assert other_client.patch(f"{API}/journal/{diario['id']}", json={"project_id": projeto_da_ana}).status_code == 404
    assert other_client.patch(f"{API}/tasks/{tarefa['id']}", json={"project_id": projeto_da_ana}).status_code == 404
    assert other_client.patch(f"{API}/learning-items/{item['id']}", json={"course_id": curso_da_ana}).status_code == 404


# ---------- entradas hostis ----------


@pytest.mark.parametrize("url", ["javascript:alert(1)", "data:text/html,<script>1</script>", "ftp://x.com/a", "//evil.com", "https:///sem-host"])
def test_enderecos_perigosos_sao_recusados(client, url):
    assert client.patch(f"{API}/users/me", json={"avatar_url": url}).status_code == 422
    for campo in ("github_url", "image_url"):
        assert client.post(f"{API}/projects", json={"name": "P", campo: url}).status_code == 422, campo
    assert client.post(f"{API}/courses", json={"title": "C", "url": url}).status_code == 422


def test_listas_de_nomes_tem_tamanho_maximo(client):
    muitos = [f"tag{n}" for n in range(500)]
    assert client.post(f"{API}/journal", json={"title": "T", "entry_date": "2026-11-01", "tags": muitos}).status_code == 422
    assert client.post(f"{API}/projects", json={"name": "P", "technologies": muitos}).status_code == 422
    assert client.patch(f"{API}/users/me", json={"interests": muitos}).status_code == 422


def test_sql_injection_nos_filtros_nao_vaza_nem_quebra(client, other_client):
    client.post(f"{API}/journal", json={"title": "normal", "entry_date": "2026-11-01"})
    for texto in ("' OR '1'='1", "%", "_", "'; DROP TABLE users;--"):
        resposta = other_client.get(f"{API}/journal", params={"q": texto})
        assert resposta.status_code == 200 and resposta.json() == [], texto
    assert client.get(f"{API}/auth/me").status_code == 200


def test_erro_interno_nao_devolve_detalhes(client, monkeypatch):
    from fastapi.testclient import TestClient

    from app.main import app
    from app.modules.journal import service

    def quebrar(*args, **kwargs):
        raise RuntimeError("senha-do-banco-vazou")

    monkeypatch.setattr(service, "list_entries", quebrar, raising=False)
    # O TestClient normal repassa a exceção ao teste; este devolve a resposta 500 que o navegador veria.
    navegador = TestClient(app, raise_server_exceptions=False)
    navegador.cookies.set("bip_session", client.cookies.get("bip_session"))
    resposta = navegador.get(f"{API}/journal")
    assert resposta.status_code == 500
    assert "senha-do-banco" not in resposta.text and "Traceback" not in resposta.text


# ---------- sessões ----------


def test_cookie_invalido_ou_adulterado_nao_autentica(anonymous):
    anonymous.cookies.set("bip_session", "x" * 43)
    assert anonymous.get(f"{API}/auth/me").status_code == 401
    anonymous.cookies.set("bip_session", "' OR 1=1 --")
    assert anonymous.get(f"{API}/auth/me").status_code == 401


def test_sessao_apagada_na_exclusao_da_conta(client, new_client):
    cookie = client.cookies.get("bip_session")
    assert client.request("DELETE", f"{API}/users/me", json={"password": PASSWORD}).status_code == 204
    outro = new_client()
    outro.cookies.set("bip_session", cookie)
    assert outro.get(f"{API}/auth/me").status_code == 401


# ---------- CSRF: o navegador manda Origin em requisições que alteram dados ----------


def test_escrita_vinda_de_outro_site_e_recusada_mesmo_com_cookie(client):
    resposta = client.post(f"{API}/tasks", json={"title": "forjada"}, headers={"Origin": "https://evil.example"})
    assert resposta.status_code == 403
    assert client.get(f"{API}/tasks").json() == []


def test_login_vindo_de_outro_site_tambem_e_recusado(anonymous):
    resposta = anonymous.post(
        f"{API}/auth/login", json={"email": "a@exemplo.com", "password": PASSWORD}, headers={"Origin": "https://evil.example"}
    )
    assert resposta.status_code == 403


def test_origem_do_proprio_app_e_aceita(client):
    from app.core.config import get_settings

    for origem in ("http://testserver", get_settings().frontend_url):
        resposta = client.post(f"{API}/tasks", json={"title": "ok"}, headers={"Origin": origem})
        assert resposta.status_code == 201, origem


def test_sem_origin_passa_e_leitura_nao_e_barrada(client):
    assert client.post(f"{API}/tasks", json={"title": "ok"}).status_code == 201
    assert client.get(f"{API}/tasks", headers={"Origin": "https://evil.example"}).status_code == 200


def test_origin_parecido_com_o_do_app_nao_engana(client):
    for origem in ("http://testserver.evil.example", "http://evil.example/testserver", "null"):
        resposta = client.post(f"{API}/tasks", json={"title": "x"}, headers={"Origin": origem})
        assert resposta.status_code == 403, origem


# ---------- respostas da API não podem ficar em cache ----------


def test_api_manda_no_store(client, anonymous):
    assert client.get(f"{API}/tasks").headers["cache-control"] == "no-store"
    assert anonymous.get(f"{API}/auth/me").headers["cache-control"] == "no-store"
    assert client.post(f"{API}/tasks", json={"title": "t"}).headers["cache-control"] == "no-store"


# ---------- confirmação de senha (trocar senha, apagar conta) ----------


def test_trocar_senha_tem_limite_de_erros_na_senha_atual(client):
    for _ in range(5):
        r = client.post(f"{API}/auth/change-password", json={"current_password": "errada-errada", "new_password": "outra-senha-123"})
        assert r.status_code == 422
    r = client.post(f"{API}/auth/change-password", json={"current_password": PASSWORD, "new_password": "outra-senha-123"})
    assert r.status_code == 429


def test_apagar_conta_tem_limite_de_erros_de_senha(client):
    for _ in range(5):
        assert client.request("DELETE", f"{API}/users/me", json={"password": "errada-errada"}).status_code == 422
    assert client.request("DELETE", f"{API}/users/me", json={"password": PASSWORD}).status_code == 429
    assert client.get(f"{API}/auth/me").status_code == 200


def test_senha_certa_zera_a_contagem_de_erros(client):
    for _ in range(4):
        client.request("DELETE", f"{API}/users/me", json={"password": "errada-errada"})
    ok = client.post(f"{API}/auth/change-password", json={"current_password": PASSWORD, "new_password": "outra-senha-123"})
    assert ok.status_code == 204
    for _ in range(4):
        assert client.request("DELETE", f"{API}/users/me", json={"password": "errada-errada"}).status_code == 422


# ---------- teto de escritas por sessão ----------


def test_escritas_por_sessao_tem_teto_e_leituras_nao_contam(client, other_client, monkeypatch):
    from app.modules.auth import dependencies

    monkeypatch.setattr(dependencies, "WRITE_LIMIT", 3)
    for _ in range(3):
        assert client.post(f"{API}/tasks", json={"title": "t"}).status_code == 201
    bloqueada = client.post(f"{API}/tasks", json={"title": "t"})
    assert bloqueada.status_code == 429 and bloqueada.json()["retry_after"] > 0
    for _ in range(5):
        assert client.get(f"{API}/tasks").status_code == 200
    assert other_client.post(f"{API}/tasks", json={"title": "t"}).status_code == 201
