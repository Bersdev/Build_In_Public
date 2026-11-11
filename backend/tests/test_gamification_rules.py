from datetime import date

import pytest

from app.modules.gamification import rules


@pytest.mark.parametrize(
    "minutos, xp",
    [(1, 1), (9, 1), (10, 1), (25, 2), (60, 6), (300, 30), (1440, 30)],
)
def test_xp_de_sessao_de_estudo(minutos, xp):
    assert rules.xp_for_study_session(minutos) == xp


@pytest.mark.parametrize(
    "xp, nivel",
    [(0, 1), (99, 1), (100, 2), (299, 2), (300, 3), (599, 3), (600, 4)],
)
def test_nivel_a_partir_do_xp(xp, nivel):
    assert rules.level_from_xp(xp) == nivel


def test_xp_necessario_para_cada_nivel():
    assert rules.xp_for_level(1) == 0
    assert rules.xp_for_level(2) == 100
    assert rules.xp_for_level(3) == 300


HOJE = date(2026, 11, 4)


@pytest.mark.parametrize(
    "datas, esperado",
    [
        ([date(2026, 11, 4), date(2026, 11, 3), date(2026, 11, 3), date(2026, 11, 1)], 2),
        ([date(2026, 11, 2), date(2026, 11, 3)], 2),
        ([date(2026, 11, 1)], 0),
        ([], 0),
    ],
)
def test_sequencia_atual(datas, esperado):
    assert rules.current_streak(datas, HOJE) == esperado


def test_maior_sequencia():
    datas = [date(2026, 1, 1), date(2026, 1, 2), date(2026, 1, 3), date(2026, 2, 1), date(2026, 2, 2)]
    assert rules.longest_streak(datas) == 3
    assert rules.longest_streak([]) == 0
