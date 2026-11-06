"""Regras das sessões de estudo.

Aqui ficam só funções que recebem dados e devolvem resultados: nada de input()
nem print(). Assim, dá para testar cada regra sozinha.

Leia o ENUNCIADO.md para ver a regra de cada função. Troque cada `pass` pela
sua solução.
"""

# Você vai precisar disto na parte 5 (sequência de dias).
from datetime import date, timedelta


def validar_sessao(minutos, tecnologia):
    """Parte 1. Devolve a tupla (ok, mensagem)."""
    pass


def criar_sessao(data, minutos, tecnologia):
    """Parte 1. Devolve o dicionário da sessão."""
    pass


def formatar_duracao(minutos):
    """Parte 2. Ex.: 135 vira "2h 15min"."""
    pass


def total_minutos(sessoes):
    """Parte 3. Soma os minutos de todas as sessões."""
    pass


def minutos_por_tecnologia(sessoes):
    """Parte 3. Devolve {tecnologia: minutos}."""
    pass


def xp_da_sessao(minutos):
    """Parte 4. 1 XP a cada 10 minutos, de 1 a 30 por sessão."""
    pass


def nivel_do_xp(xp):
    """Parte 4. Devolve o nível correspondente ao XP total."""
    pass


def sequencia_atual(sessoes, hoje):
    """Parte 5. Dias seguidos de estudo, terminando hoje ou ontem."""
    pass
