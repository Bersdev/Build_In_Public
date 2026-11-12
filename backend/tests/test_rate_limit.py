"""Limite de tentativas: segura força bruta no login, abuso no cadastro e gasto da cota da IA."""

from datetime import timedelta

import pytest

from app.core import groq, rate_limit
from app.core.config import get_settings
from app.core.database import utcnow
from app.modules.imports import service as imports_service
from tests.conftest import PASSWORD
from tests.test_imports import CSV, RESPOSTA_DA_IA

AUTH = "/api/v1/auth"


def _tentar_login(client, email, senha="senha-errada-123", ip=None):
    headers = {"x-forwarded-for": ip} if ip else {}
    return client.post(f"{AUTH}/login", json={"email": email, "password": senha}, headers=headers)


@pytest.fixture
def conta(anonymous):
    anonymous.post(f"{AUTH}/register", json={"name": "Ana", "email": "ana@exemplo.com", "password": PASSWORD})
    return "ana@exemplo.com"


# ---------- mecanismo ----------


def test_conta_so_eventos_dentro_da_janela(db):
    for _ in range(3):
        rate_limit.record(db, "chave")
    with pytest.raises(rate_limit.TooManyRequests):
        rate_limit.ensure_allowed(db, "chave", limit=3, window_seconds=60)
    rate_limit.ensure_allowed(db, "chave", limit=4, window_seconds=60)


def test_eventos_antigos_nao_contam(db):
    db.add(rate_limit.RateLimitEvent(key=rate_limit.hash_key("chave"), created_at=utcnow() - timedelta(minutes=30)))
    db.commit()
    rate_limit.ensure_allowed(db, "chave", limit=1, window_seconds=600)


def test_chaves_diferentes_nao_se_misturam(db):
    rate_limit.record(db, "a")
    rate_limit.ensure_allowed(db, "b", limit=1, window_seconds=60)


def test_espera_sugerida_e_o_tempo_ate_o_evento_mais_antigo_sair_da_janela(db):
    db.add(rate_limit.RateLimitEvent(key=rate_limit.hash_key("k"), created_at=utcnow() - timedelta(seconds=40)))
    db.commit()
    with pytest.raises(rate_limit.TooManyRequests) as erro:
        rate_limit.ensure_allowed(db, "k", limit=1, window_seconds=60)
    assert 15 <= erro.value.extra["retry_after"] <= 20


def test_chave_nao_fica_guardada_em_texto_puro(db):
    rate_limit.record(db, "login:email:ana@exemplo.com")
    guardada = db.query(rate_limit.RateLimitEvent).one().key
    assert "ana" not in guardada and len(guardada) == 64


def test_reset_apaga_so_a_chave_pedida(db):
    rate_limit.record(db, "a")
    rate_limit.record(db, "b")
    rate_limit.reset(db, "a")
    rate_limit.ensure_allowed(db, "a", limit=1, window_seconds=60)
    with pytest.raises(rate_limit.TooManyRequests):
        rate_limit.ensure_allowed(db, "b", limit=1, window_seconds=60)


def test_hit_grava_antes_de_contar_e_nao_deixa_a_tentativa_barrada(db):
    for _ in range(3):
        rate_limit.hit(db, "k", limit=3, window_seconds=60)
    with pytest.raises(rate_limit.TooManyRequests):
        rate_limit.hit(db, "k", limit=3, window_seconds=60)
    assert db.query(rate_limit.RateLimitEvent).count() == 3


def test_release_desfaz_so_aquela_tentativa(db):
    primeira = rate_limit.hit(db, "k", limit=2, window_seconds=60)
    rate_limit.hit(db, "k", limit=2, window_seconds=60)
    rate_limit.release(db, primeira)
    assert db.query(rate_limit.RateLimitEvent).count() == 1


def test_ipv6_e_agrupado_pelo_bloco_64():
    assert rate_limit.normalize_ip("2001:db8:1:2::1") == rate_limit.normalize_ip("2001:db8:1:2:ffff:0:0:9")
    assert rate_limit.normalize_ip("2001:db8:1:2::1") != rate_limit.normalize_ip("2001:db8:1:3::1")
    assert rate_limit.normalize_ip("203.0.113.7") == "203.0.113.7"
    assert rate_limit.normalize_ip("não-é-ip") == "não-é-ip"


def test_trocar_de_endereco_dentro_do_mesmo_bloco_ipv6_nao_burla_o_limite(anonymous, conta):
    for final in range(5):
        assert _tentar_login(anonymous, conta, ip=f"2001:db8:1:2::{final + 1}").status_code == 401
    assert _tentar_login(anonymous, conta, ip="2001:db8:1:2:abcd::1").status_code == 429


# ---------- login ----------


def test_login_bloqueia_depois_de_cinco_erros_no_mesmo_email(anonymous, conta):
    for _ in range(5):
        assert _tentar_login(anonymous, conta).status_code == 401
    bloqueado = _tentar_login(anonymous, conta)
    assert bloqueado.status_code == 429
    assert bloqueado.json()["retry_after"] > 0
    assert "tentativas" in bloqueado.json()["detail"].lower()


def test_login_bloqueado_recusa_ate_a_senha_certa(anonymous, conta):
    for _ in range(5):
        _tentar_login(anonymous, conta)
    assert _tentar_login(anonymous, conta, senha=PASSWORD).status_code == 429


def test_login_certo_zera_a_contagem_do_email(anonymous, conta):
    for _ in range(4):
        _tentar_login(anonymous, conta)
    assert _tentar_login(anonymous, conta, senha=PASSWORD).status_code == 200
    for _ in range(4):
        assert _tentar_login(anonymous, conta).status_code == 401


def test_erros_em_um_email_nao_bloqueiam_outro(anonymous, conta):
    for _ in range(6):
        _tentar_login(anonymous, conta)
    assert _tentar_login(anonymous, "outra@exemplo.com").status_code == 401


def test_email_inexistente_tambem_e_limitado_e_responde_igual(anonymous):
    for _ in range(5):
        assert _tentar_login(anonymous, "fantasma@exemplo.com").status_code == 401
    assert _tentar_login(anonymous, "fantasma@exemplo.com").status_code == 429


def test_email_em_maiusculas_conta_como_o_mesmo(anonymous, conta):
    for _ in range(5):
        _tentar_login(anonymous, "ANA@Exemplo.com")
    assert _tentar_login(anonymous, conta).status_code == 429


def test_estranho_nao_tranca_a_conta_de_quem_usa_outro_ip(anonymous, conta):
    for _ in range(5):
        _tentar_login(anonymous, conta, ip="198.51.100.1")
    assert _tentar_login(anonymous, conta, ip="198.51.100.1").status_code == 429
    assert _tentar_login(anonymous, conta, senha=PASSWORD, ip="198.51.100.2").status_code == 200


def test_ataque_de_varios_ips_ao_mesmo_email_tambem_e_barrado(anonymous, conta):
    for ip in range(10):
        for _ in range(5):
            assert _tentar_login(anonymous, conta, ip=f"192.0.2.{ip}").status_code == 401
    assert _tentar_login(anonymous, conta, senha=PASSWORD, ip="192.0.2.200").status_code == 429


def test_tentativas_barradas_nao_prolongam_o_bloqueio(anonymous, conta, db):
    for _ in range(5):
        _tentar_login(anonymous, conta)
    antes = db.query(rate_limit.RateLimitEvent).count()
    for _ in range(4):
        assert _tentar_login(anonymous, conta).status_code == 429
    assert db.query(rate_limit.RateLimitEvent).count() == antes


def test_login_certo_nao_conta_como_falha_para_o_ip(anonymous, conta, db):
    antes = db.query(rate_limit.RateLimitEvent).count()  # o cadastro da fixture também conta
    assert _tentar_login(anonymous, conta, senha=PASSWORD).status_code == 200
    assert db.query(rate_limit.RateLimitEvent).count() == antes


def test_login_bloqueia_um_ip_que_tenta_muitos_emails(anonymous):
    for numero in range(30):
        assert _tentar_login(anonymous, f"pessoa{numero}@exemplo.com", ip="203.0.113.7").status_code == 401
    assert _tentar_login(anonymous, "nova@exemplo.com", ip="203.0.113.7").status_code == 429
    assert _tentar_login(anonymous, "nova@exemplo.com", ip="203.0.113.8").status_code == 401


# ---------- cadastro e recuperação de senha ----------


def test_cadastro_limita_contas_criadas_pelo_mesmo_ip(anonymous):
    for numero in range(20):
        resposta = anonymous.post(
            f"{AUTH}/register", json={"name": "P", "email": f"p{numero}@exemplo.com", "password": PASSWORD}
        )
        assert resposta.status_code == 201
    bloqueado = anonymous.post(
        f"{AUTH}/register", json={"name": "P", "email": "p99@exemplo.com", "password": PASSWORD}
    )
    assert bloqueado.status_code == 429


def test_pedidos_de_recuperacao_de_senha_sao_limitados_por_ip(anonymous):
    for _ in range(10):
        assert anonymous.post(f"{AUTH}/forgot-password", json={"email": "x@exemplo.com"}).status_code == 202
    assert anonymous.post(f"{AUTH}/forgot-password", json={"email": "x@exemplo.com"}).status_code == 429


# ---------- importação com IA ----------


def test_analise_com_ia_tem_limite_por_usuario(client, other_client, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "chave-de-teste")
    monkeypatch.setattr(groq, "complete_json", lambda messages, schema: RESPOSTA_DA_IA)
    monkeypatch.setattr(imports_service, "ANALYZE_LIMIT", 2)

    corpo = {"content": CSV}
    assert client.post("/api/v1/imports/analyze", json=corpo).status_code == 200
    assert client.post("/api/v1/imports/analyze", json=corpo).status_code == 200
    bloqueado = client.post("/api/v1/imports/analyze", json=corpo)
    assert bloqueado.status_code == 429
    assert bloqueado.json()["retry_after"] > 120
    assert other_client.post("/api/v1/imports/analyze", json=corpo).status_code == 200


def test_analise_sem_chave_da_ia_nao_gasta_o_limite(client, monkeypatch):
    monkeypatch.setattr(get_settings(), "groq_api_key", "")
    monkeypatch.setattr(imports_service, "ANALYZE_LIMIT", 1)
    for _ in range(3):
        assert client.post("/api/v1/imports/analyze", json={"content": CSV}).status_code == 503
