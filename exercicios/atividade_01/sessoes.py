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
    if minutos < 1:
        return (False, "Os minutos não podem ser menores que 1.")
    if minutos > 1440:
        return (False, "Minutos incompatíveis")
    
    if tecnologia.strip() == "":
        return(False, "A tecnologia não pode ficar vazia.")
    
    return (True, "")

def criar_sessao(data, minutos, tecnologia):
    """Parte 1. Devolve o dicionário da sessão."""
    sessao = {"data": data, "minutos": minutos, "tecnologia": tecnologia}
    date.isoformat(): date(2026, 11, 7).isoformat().strip()
    return sessao 

def formatar_duracao(minutos:int)-> str:
    """Parte 2. Ex.: 135 vira "2h 15min"."""
    horas, resto = divmod(minutos, 60)
    if horas == 0:
        return f"{resto}min"
    if resto == 0:
        return f"{horas}h"
    return f"{horas}h {resto}min"
    

def total_minutos(sessoes):
    """Parte 3. Soma os minutos de todas as sessões."""
    total = 0
    for sessao in sessoes:
        total += sessao["minutos"]
    return total
    

def minutos_por_tecnologia(sessoes):
    """Parte 3. Devolve {tecnologia: minutos}."""
    total = {}
    grafias = {}
    
    for sessao in sessoes:
        nome = sessao['tecnologia']
        minutos = sessao['minutos']
        chave = nome.lower()
        
        if chave not in grafias:
            grafias[chave] = nome
            
        tecnologia = grafias[chave]
            
        if tecnologia in total:
            total[tecnologia] += minutos
        else:
            total[tecnologia] = minutos
        
    return total
    


def xp_da_sessao(minutos):
    """Parte 4. 1 XP a cada 10 minutos, de 1 a 30 por sessão."""
    xp_calculado = minutos // 10
    
    xp_final = max(1, min(xp_calculado, 30))
    
    return xp_final

def nivel_do_xp(xp):
    """Parte 4. Devolve o nível correspondente ao XP total."""
    nivel = 1
    while xp >=  :      # XP necessário para o PRÓXIMO nível
                      # sobe um nível
    return nivel

def sequencia_atual(sessoes, hoje):
    """Parte 5. Dias seguidos de estudo, terminando hoje ou ontem."""
    dias_com_sessao = {sessao.date() if  hasattr(sessao,'date') else sessao for sessao in sessoes}
    
    ontem = hoje - timedelta(days=1)
    
    if hoje not in dias_com_sessao and ontem not in dias_com_sessao:
        return 0
    
    dia_analisado = hoje if hoje in dias_com_sessao else ontem
    contador_sequencia = 0 
    
    while dia_analisado in dias_com_sessao:
        contador_sequencia += 1
        dia_analisado -= timedelta(days=1) 
        
    return contador_sequencia   
