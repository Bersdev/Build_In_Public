from datetime import timedelta

from sqlalchemy import select

from app.core.database import utcnow
from app.modules.auth import service as auth_service
from app.modules.auth.models import PasswordResetToken, User, UserSession
from tests.conftest import PASSWORD

AUTH = "/api/v1/auth"


def test_cadastro_entra_na_conta_e_nao_devolve_a_senha(anonymous):
    resposta = anonymous.post(
        f"{AUTH}/register", json={"name": "Ana", "email": "Ana@Exemplo.com", "password": PASSWORD}
    )
    assert resposta.status_code == 201
    corpo = resposta.json()
    assert corpo["email"] == "ana@exemplo.com"
    assert "password" not in str(corpo).lower()
    assert anonymous.get(f"{AUTH}/me").status_code == 200


def test_cookie_de_sessao_e_inacessivel_ao_javascript(anonymous):
    resposta = anonymous.post(
        f"{AUTH}/register", json={"name": "Ana", "email": "a@exemplo.com", "password": PASSWORD}
    )
    cookie = resposta.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie


def test_cadastro_guarda_o_fuso_informado_pelo_navegador(anonymous):
    corpo = {"name": "Ana", "email": "a@exemplo.com", "password": PASSWORD, "timezone": "Europe/Lisbon"}
    assert anonymous.post(f"{AUTH}/register", json=corpo).json()["timezone"] == "Europe/Lisbon"


def test_cadastro_recusa_fuso_inexistente(anonymous):
    corpo = {"name": "Ana", "email": "a@exemplo.com", "password": PASSWORD, "timezone": "Marte/Base"}
    assert anonymous.post(f"{AUTH}/register", json=corpo).status_code == 422


def test_senha_com_espacos_nas_pontas_e_preservada(anonymous):
    senha = "  senha com espacos  "
    assert anonymous.post(f"{AUTH}/register", json={"name": "Ana", "email": "a@exemplo.com", "password": senha}).status_code == 201
    assert anonymous.post(f"{AUTH}/login", json={"email": "a@exemplo.com", "password": senha}).status_code == 200
    assert anonymous.post(f"{AUTH}/login", json={"email": "a@exemplo.com", "password": senha.strip()}).status_code == 401


def test_senha_e_guardada_somente_como_hash(client, db):
    usuario = db.scalar(select(User).where(User.email == "ana@exemplo.com"))
    assert PASSWORD not in usuario.password_hash
    assert usuario.password_hash.startswith("$argon2")


def test_email_repetido_e_recusado(client, anonymous):
    resposta = anonymous.post(
        f"{AUTH}/register", json={"name": "Ana", "email": "ANA@exemplo.com", "password": PASSWORD}
    )
    assert resposta.status_code == 409


def test_senha_curta_e_recusada_sem_ser_repetida_na_resposta(anonymous):
    resposta = anonymous.post(
        f"{AUTH}/register", json={"name": "Ana", "email": "a@exemplo.com", "password": "curta1"}
    )
    assert resposta.status_code == 422
    assert "curta1" not in resposta.text


def test_login_e_logout(client, anonymous):
    assert anonymous.post(f"{AUTH}/login", json={"email": "ana@exemplo.com", "password": PASSWORD}).status_code == 200
    assert anonymous.get(f"{AUTH}/me").status_code == 200
    assert anonymous.post(f"{AUTH}/logout").status_code == 204
    assert anonymous.get(f"{AUTH}/me").status_code == 401


def test_logout_invalida_o_token_mesmo_se_o_cookie_for_reutilizado(client):
    token = client.cookies.get("bip_session")
    client.post(f"{AUTH}/logout")
    client.cookies.set("bip_session", token)
    assert client.get(f"{AUTH}/me").status_code == 401


def test_login_nao_revela_se_o_email_existe(client, anonymous):
    senha_errada = anonymous.post(f"{AUTH}/login", json={"email": "ana@exemplo.com", "password": "errada-123456"})
    inexistente = anonymous.post(f"{AUTH}/login", json={"email": "nao@exemplo.com", "password": "errada-123456"})
    assert senha_errada.status_code == inexistente.status_code == 401
    assert senha_errada.json() == inexistente.json()


def test_rotas_protegidas_exigem_login(anonymous):
    assert anonymous.get(f"{AUTH}/me").status_code == 401
    assert anonymous.get("/api/v1/users/me").status_code == 401


def test_sessao_expirada_e_recusada(client, db):
    sessao = db.scalar(select(UserSession))
    sessao.expires_at = utcnow() - timedelta(minutes=1)
    db.commit()
    assert client.get(f"{AUTH}/me").status_code == 401


def _pedir_token(anonymous, monkeypatch, email="ana@exemplo.com"):
    capturados = []
    monkeypatch.setattr(auth_service, "deliver_reset_link", lambda _email, link: capturados.append(link))
    resposta = anonymous.post(f"{AUTH}/forgot-password", json={"email": email})
    assert resposta.status_code == 202
    return capturados


def test_recuperacao_de_senha_completa(client, anonymous, monkeypatch):
    link = _pedir_token(anonymous, monkeypatch)[0]
    token = link.split("token=")[1]
    nova = "nova-senha-456789"

    assert anonymous.post(f"{AUTH}/reset-password", json={"token": token, "new_password": nova}).status_code == 204
    assert anonymous.post(f"{AUTH}/login", json={"email": "ana@exemplo.com", "password": PASSWORD}).status_code == 401
    assert anonymous.post(f"{AUTH}/login", json={"email": "ana@exemplo.com", "password": nova}).status_code == 200
    # A sessão aberta antes da troca deixa de valer.
    assert client.get(f"{AUTH}/me").status_code == 401


def test_recuperacao_nao_revela_email_inexistente(anonymous, monkeypatch):
    assert _pedir_token(anonymous, monkeypatch, "nao@exemplo.com") == []


def test_token_de_recuperacao_so_vale_uma_vez(client, anonymous, monkeypatch):
    token = _pedir_token(anonymous, monkeypatch)[0].split("token=")[1]
    corpo = {"token": token, "new_password": "nova-senha-456789"}
    assert anonymous.post(f"{AUTH}/reset-password", json=corpo).status_code == 204
    assert anonymous.post(f"{AUTH}/reset-password", json=corpo).status_code == 422


def test_token_de_recuperacao_expirado_e_recusado(client, anonymous, monkeypatch, db):
    token = _pedir_token(anonymous, monkeypatch)[0].split("token=")[1]
    registro = db.scalar(select(PasswordResetToken))
    assert token not in registro.token_hash
    registro.expires_at = utcnow() - timedelta(minutes=1)
    db.commit()
    corpo = {"token": token, "new_password": "nova-senha-456789"}
    assert anonymous.post(f"{AUTH}/reset-password", json=corpo).status_code == 422


def test_trocar_senha_exige_a_senha_atual(client):
    errada = {"current_password": "errada-123456", "new_password": "nova-senha-456789"}
    certa = {"current_password": PASSWORD, "new_password": "nova-senha-456789"}
    assert client.post(f"{AUTH}/change-password", json=errada).status_code == 422
    assert client.post(f"{AUTH}/change-password", json=certa).status_code == 204
    assert client.get(f"{AUTH}/me").status_code == 200
