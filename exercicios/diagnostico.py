# Exercícios de diagnóstico do Build in Public
#
# Usam o conteúdo do nanocurso da FIAP. Resolva sem IA; pode consultar suas
# anotações e a documentação do Python. Se travar, deixe como está e escreva
# um comentário dizendo até onde chegou: isso também ajuda.
#
# Para executar, a partir da raiz do projeto:
#   python exercicios/diagnostico.py
#
# Substitua cada "pass" pela sua solução. Antes de resolver, tudo aparece como
# FALHOU, e isso é esperado. Não altere a parte de verificação no fim do arquivo.

import json
import os
from datetime import date, timedelta


# Exercício 1: formatar uma duração
# Recebe minutos e devolve um texto. Exemplos:
#   135 -> "2h15min"    45 -> "45min"    60 -> "1h"    0 -> "0min"
# Se os minutos forem negativos, devolva "inválido".
def formatar_duracao(minutos):
    pass


# Exercício 2: somar minutos por tecnologia
# Recebe uma lista de dicionários e devolve um dicionário com o total de cada
# tecnologia. Veja o exemplo na verificação, mais abaixo.
def minutos_por_tecnologia(sessoes):
    pass


# Exercício 3: listar tarefas pendentes
# Recebe uma lista de dicionários e devolve uma lista com os títulos das
# tarefas cujo status é diferente de "concluido", mantendo a ordem original.
def tarefas_pendentes(tarefas):
    pass


# Exercício 4: guardar sessões em JSON
# salvar_sessoes grava a lista no arquivo indicado.
# carregar_sessoes lê o arquivo e devolve a lista.
# Se o arquivo não existir, carregar_sessoes devolve uma lista vazia.
def salvar_sessoes(sessoes, caminho):
    pass


def carregar_sessoes(caminho):
    pass


# Exercício 5 (desafio): sequência de estudos
# Recebe uma lista de datas e a data de hoje, e devolve quantos dias seguidos
# houve estudo. A sequência pode terminar hoje ou ontem, porque quem ainda não
# estudou hoje não a perdeu. As datas podem vir fora de ordem ou repetidas.
#
# Conceito novo: timedelta representa um intervalo de tempo.
#   date(2026, 11, 4) - timedelta(days=1)  resulta em  date(2026, 11, 3)
def sequencia_atual(datas, hoje):
    pass


# Pergunta final (responda com suas palavras, neste comentário)
# O Diário tem "tempo dedicado" e as sessões de estudo também têm duração. Se o
# Dashboard somar os dois, os totais ficam errados. Como você evitaria isso?
#
# Sua resposta:


# ===== VERIFICAÇÃO: não altere daqui para baixo =====

def verificar(descricao, obtido, esperado):
    if obtido == esperado:
        print("OK     ", descricao)
    else:
        print("FALHOU ", descricao, "| esperado:", esperado, "| obtido:", obtido)


print("Exercício 1")
verificar("135 minutos", formatar_duracao(135), "2h15min")
verificar("45 minutos", formatar_duracao(45), "45min")
verificar("60 minutos", formatar_duracao(60), "1h")
verificar("0 minutos", formatar_duracao(0), "0min")
verificar("valor negativo", formatar_duracao(-5), "inválido")

print("\nExercício 2")
sessoes_exemplo = [
    {"tecnologia": "Python", "minutos": 90},
    {"tecnologia": "SQL", "minutos": 30},
    {"tecnologia": "Python", "minutos": 45},
]
verificar("soma por tecnologia", minutos_por_tecnologia(sessoes_exemplo), {"Python": 135, "SQL": 30})
verificar("lista vazia", minutos_por_tecnologia([]), {})

print("\nExercício 3")
tarefas_exemplo = [
    {"titulo": "Estudar listas", "status": "concluido"},
    {"titulo": "Criar repositório", "status": "a_fazer"},
    {"titulo": "Revisar funções", "status": "em_andamento"},
]
verificar("títulos pendentes", tarefas_pendentes(tarefas_exemplo), ["Criar repositório", "Revisar funções"])
verificar("lista vazia", tarefas_pendentes([]), [])

print("\nExercício 4")
caminho_teste = os.path.join(os.path.dirname(__file__), "sessoes_teste.json")
if os.path.exists(caminho_teste):
    os.remove(caminho_teste)
verificar("arquivo inexistente", carregar_sessoes(caminho_teste), [])
salvar_sessoes(sessoes_exemplo, caminho_teste)
verificar("salvar e carregar", carregar_sessoes(caminho_teste), sessoes_exemplo)
if os.path.exists(caminho_teste):
    os.remove(caminho_teste)

print("\nExercício 5")
hoje_exemplo = date(2026, 11, 4)
verificar(
    "termina hoje, com repetição e falha",
    sequencia_atual([date(2026, 11, 4), date(2026, 11, 3), date(2026, 11, 3), date(2026, 11, 1)], hoje_exemplo),
    2,
)
verificar(
    "termina ontem, fora de ordem",
    sequencia_atual([date(2026, 11, 2), date(2026, 11, 3)], hoje_exemplo),
    2,
)
verificar("sequência perdida", sequencia_atual([date(2026, 11, 1)], hoje_exemplo), 0)
verificar("sem estudos", sequencia_atual([], hoje_exemplo), 0)
