from tests.conftest import PASSWORD

ME = "/api/v1/users/me"


def test_perfil_comeca_com_a_data_de_entrada(client):
    perfil = client.get(ME).json()
    assert perfil["name"] == "Pessoa Teste"
    assert perfil["created_at"]
    assert perfil["timezone"] == "America/Sao_Paulo"


def test_editar_perfil(client):
    resposta = client.patch(
        ME,
        json={
            "name": "Ana Lima",
            "bio": "Estudo Python",
            "career_goal": "Backend",
            "experience_level": "beginner",
            "avatar_url": "https://exemplo.com/foto.png",
            "interests": ["Python", "python", "SQL"],
        },
    )
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["name"] == "Ana Lima"
    assert corpo["interests"] == ["Python", "SQL"]


def test_perfil_recusa_endereco_de_foto_perigoso(client):
    assert client.patch(ME, json={"avatar_url": "javascript:alert(1)"}).status_code == 422


def test_perfil_recusa_fuso_inexistente(client):
    assert client.patch(ME, json={"timezone": "Marte/Base"}).status_code == 422


def test_perfil_recusa_nome_nulo(client):
    assert client.patch(ME, json={"name": None}).status_code == 422


def test_configuracoes_padrao_usam_tema_escuro(client):
    configuracoes = client.get(f"{ME}/settings").json()
    assert configuracoes["theme"] == "dark"


def test_editar_configuracoes(client):
    resposta = client.patch(f"{ME}/settings", json={"theme": "light", "email_notifications": False})
    assert resposta.status_code == 200
    assert client.get(f"{ME}/settings").json()["theme"] == "light"
    assert client.patch(f"{ME}/settings", json={"theme": "roxo"}).status_code == 422


def test_excluir_conta_exige_senha_e_remove_o_acesso(client, anonymous):
    assert client.request("DELETE", ME, json={"password": "errada-123456"}).status_code == 422
    assert client.request("DELETE", ME, json={"password": PASSWORD}).status_code == 204
    login = anonymous.post("/api/v1/auth/login", json={"email": "ana@exemplo.com", "password": PASSWORD})
    assert login.status_code == 401
