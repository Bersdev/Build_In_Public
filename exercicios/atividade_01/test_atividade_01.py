"""Testes da Atividade 1. Não altere este arquivo: ele é a régua.

Rode uma parte por vez, por exemplo:
    & $py -m pytest exercicios/atividade_01 -k parte1
"""

import json
from datetime import date

import pytest

from armazenamento import carregar_sessoes, salvar_sessoes
from sessoes import (
    criar_sessao,
    formatar_duracao,
    minutos_por_tecnologia,
    nivel_do_xp,
    sequencia_atual,
    total_minutos,
    validar_sessao,
    xp_da_sessao,
)


def sessao(minutos=10, tecnologia="Python", dia="2026-11-04"):
    return {"data": dia, "minutos": minutos, "tecnologia": tecnologia}


# ---------- Parte 1: validar e criar ----------


def test_parte1_sessao_valida_devolve_true_e_mensagem_vazia():
    assert validar_sessao(45, "Python") == (True, "")


@pytest.mark.parametrize("minutos", [1, 1440])
def test_parte1_limites_sao_aceitos(minutos):
    assert validar_sessao(minutos, "Python")[0] is True


@pytest.mark.parametrize(
    "minutos, tecnologia",
    [(0, "Python"), (-5, "Python"), (1441, "Python"), (30, ""), (30, "   ")],
)
def test_parte1_dados_invalidos_devolvem_false_e_uma_mensagem(minutos, tecnologia):
    ok, mensagem = validar_sessao(minutos, tecnologia)
    assert ok is False
    assert mensagem != ""


def test_parte1_criar_sessao_monta_o_dicionario():
    criada = criar_sessao(date(2026, 11, 4), 45, "  Python ")
    assert criada == {"data": "2026-11-04", "minutos": 45, "tecnologia": "Python"}


# ---------- Parte 2: formatar a duração ----------


@pytest.mark.parametrize(
    "minutos, texto",
    [(135, "2h 15min"), (45, "45min"), (60, "1h"), (0, "0min"), (1440, "24h"), (61, "1h 1min")],
)
def test_parte2_formatar_duracao(minutos, texto):
    assert formatar_duracao(minutos) == texto


# ---------- Parte 3: somar o tempo ----------


def test_parte3_total_minutos():
    assert total_minutos([sessao(90), sessao(30), sessao(45)]) == 165
    assert total_minutos([]) == 0


def test_parte3_minutos_por_tecnologia():
    sessoes = [sessao(90, "Python"), sessao(30, "SQL"), sessao(45, "Python")]
    assert minutos_por_tecnologia(sessoes) == {"Python": 135, "SQL": 30}


def test_parte3_sem_sessoes_o_dicionario_e_vazio():
    assert minutos_por_tecnologia([]) == {}


def test_parte3_maiusculas_e_minusculas_sao_a_mesma_tecnologia():
    sessoes = [sessao(10, "python"), sessao(5, "Python"), sessao(1, "PYTHON")]
    assert minutos_por_tecnologia(sessoes) == {"python": 16}


# ---------- Parte 4: pontos e nível ----------


@pytest.mark.parametrize(
    "minutos, xp",
    [(1, 1), (5, 1), (9, 1), (10, 1), (25, 2), (60, 6), (299, 29), (300, 30), (1440, 30)],
)
def test_parte4_xp_da_sessao(minutos, xp):
    assert xp_da_sessao(minutos) == xp


@pytest.mark.parametrize(
    "xp, nivel",
    [
        (0, 1),
        (99, 1),
        (100, 2),
        (299, 2),
        (300, 3),
        (599, 3),
        (600, 4),
        (999, 4),
        (1000, 5),
        (1500, 6),
        (4499, 9),
        (4500, 10),
    ],
)
def test_parte4_nivel_do_xp(xp, nivel):
    assert nivel_do_xp(xp) == nivel


# ---------- Parte 5: sequência de dias ----------

HOJE = date(2026, 11, 4)


def dias(*datas):
    return [sessao(dia=dia) for dia in datas]


def test_parte5_sequencia_termina_hoje_com_repeticao_e_falha():
    sessoes = dias("2026-11-04", "2026-11-03", "2026-11-03", "2026-11-01")
    assert sequencia_atual(sessoes, HOJE) == 2


def test_parte5_sequencia_termina_ontem_e_vem_fora_de_ordem():
    assert sequencia_atual(dias("2026-11-02", "2026-11-03"), HOJE) == 2


def test_parte5_sequencia_perdida_vale_zero():
    assert sequencia_atual(dias("2026-11-01"), HOJE) == 0


def test_parte5_sem_sessoes_vale_zero():
    assert sequencia_atual([], HOJE) == 0


def test_parte5_atravessa_a_virada_do_mes():
    sessoes = dias("2026-10-30", "2026-10-31", "2026-11-01")
    assert sequencia_atual(sessoes, date(2026, 11, 1)) == 3


def test_parte5_duas_sessoes_no_mesmo_dia_contam_um_dia():
    assert sequencia_atual(dias("2026-11-04", "2026-11-04", "2026-11-04"), HOJE) == 1


# ---------- Parte 6: guardar em arquivo ----------


def test_parte6_arquivo_inexistente_devolve_lista_vazia(tmp_path):
    assert carregar_sessoes(tmp_path / "nao_existe.json") == []


def test_parte6_salvar_e_carregar_devolve_a_mesma_lista(tmp_path):
    caminho = tmp_path / "sessoes.json"
    sessoes = [sessao(90, "Programação"), sessao(30, "Estruturas de dados", "2026-11-05")]
    salvar_sessoes(sessoes, caminho)
    assert carregar_sessoes(caminho) == sessoes


def test_parte6_salvar_troca_o_conteudo_anterior(tmp_path):
    caminho = tmp_path / "sessoes.json"
    salvar_sessoes([sessao(10), sessao(20)], caminho)
    salvar_sessoes([sessao(30)], caminho)
    assert carregar_sessoes(caminho) == [sessao(30)]


def test_parte6_o_arquivo_e_um_json_valido_em_utf8(tmp_path):
    caminho = tmp_path / "sessoes.json"
    salvar_sessoes([sessao(10, "Programação")], caminho)
    with open(caminho, encoding="utf-8") as arquivo:
        assert json.load(arquivo)[0]["tecnologia"] == "Programação"
