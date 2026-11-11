PATHS = "/api/v1/learning-paths"
IMPORT = f"{PATHS}/import"

CSV_BASICO = """etapa,item,link,notas
Fundamentos,Variáveis e tipos,https://docs.python.org/3/tutorial/introduction.html,
Fundamentos,Condicionais,,Ver if/elif/else
Web,FastAPI,https://fastapi.tiangolo.com,"Rotas, schemas e testes"
"""


def _importar(client, conteudo, **campos):
    return client.post(IMPORT, json={"title": "Back-end com Python", "content": conteudo, **campos})


def test_importa_trilha_com_etapas_e_conteudos_na_ordem(client):
    resposta = _importar(client, CSV_BASICO, technology="Python")
    assert resposta.status_code == 201, resposta.text
    trilha = resposta.json()

    assert trilha["title"] == "Back-end com Python"
    assert trilha["technology"] == "Python"
    assert trilha["total_items"] == 3
    assert [etapa["title"] for etapa in trilha["stages"]] == ["Fundamentos", "Web"]
    fundamentos, web = trilha["stages"]
    assert [item["title"] for item in fundamentos["items"]] == ["Variáveis e tipos", "Condicionais"]
    assert fundamentos["items"][1]["notes"] == "Ver if/elif/else"
    assert fundamentos["items"][1]["url"] is None
    assert web["items"][0]["notes"] == "Rotas, schemas e testes"

    assert client.get(f"{PATHS}/{trilha['id']}").json()["stages"] == trilha["stages"]


def test_aceita_ponto_e_virgula_bom_e_cabecalhos_em_portugues(client):
    # O Excel em português salva com ";" e, em UTF-8, coloca um BOM no início.
    conteudo = "﻿Etapa;Conteúdo;Link;Observações\r\nBanco;SQL básico;https://sqlbolt.com;\r\n"
    resposta = _importar(client, conteudo)
    assert resposta.status_code == 201, resposta.text
    etapa = resposta.json()["stages"][0]
    assert etapa["title"] == "Banco"
    assert etapa["items"][0]["title"] == "SQL básico"
    assert etapa["items"][0]["url"] == "https://sqlbolt.com"


def test_sem_coluna_de_etapa_cria_uma_etapa_unica(client):
    resposta = _importar(client, "titulo\nListas\nDicionários\n")
    assert resposta.status_code == 201, resposta.text
    etapas = resposta.json()["stages"]
    assert len(etapas) == 1
    assert etapas[0]["title"] == "Conteúdos"
    assert [item["title"] for item in etapas[0]["items"]] == ["Listas", "Dicionários"]


def test_linhas_vazias_sao_ignoradas_e_etapa_vazia_herda_a_anterior(client):
    conteudo = "etapa,item\nBase,Git\n,,\n,GitHub\n"
    resposta = _importar(client, conteudo)
    assert resposta.status_code == 201, resposta.text
    etapas = resposta.json()["stages"]
    assert [item["title"] for item in etapas[0]["items"]] == ["Git", "GitHub"]


def test_erros_indicam_a_linha_e_nada_e_criado(client):
    conteudo = "etapa,item,link\nBase,Git,https://git-scm.com\nBase,,\nBase,Docker,javascript:alert(1)\n"
    resposta = _importar(client, conteudo)
    assert resposta.status_code == 422
    erros = resposta.json()["errors"]
    assert {"field": "Linha 3", "message": "O conteúdo não pode ficar vazio."} in erros
    assert any(erro["field"] == "Linha 4" and "http" in erro["message"] for erro in erros)
    assert client.get(PATHS).json() == []


def test_exige_a_coluna_do_conteudo(client):
    resposta = _importar(client, "etapa,link\nBase,https://exemplo.com\n")
    assert resposta.status_code == 422
    assert "coluna" in resposta.json()["detail"].lower()


def test_arquivo_sem_conteudos_e_recusado(client):
    assert _importar(client, "etapa,item\n").status_code == 422
    assert _importar(client, "").status_code == 422


def test_limita_a_quantidade_de_conteudos(client):
    linhas = "\n".join(f"Etapa,Conteúdo {numero}" for numero in range(501))
    resposta = _importar(client, f"etapa,item\n{linhas}\n")
    assert resposta.status_code == 422
    assert "500" in resposta.json()["detail"]


def test_titulo_e_obrigatorio(client):
    resposta = client.post(IMPORT, json={"title": " ", "content": CSV_BASICO})
    assert resposta.status_code == 422


def test_trilha_importada_pertence_so_a_quem_importou(client, other_client):
    trilha = _importar(client, CSV_BASICO).json()
    assert other_client.get(f"{PATHS}/{trilha['id']}").status_code == 404
    assert other_client.get(PATHS).json() == []
