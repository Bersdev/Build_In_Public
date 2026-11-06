# Atividade 1: diário de estudos no terminal

## O que você vai construir

Um programa de terminal que registra suas sessões de estudo, salva tudo em um arquivo e mostra um resumo com total de horas, tempo por tecnologia, sequência de dias, XP e nível.

É uma versão pequena de dois módulos do Build in Public: **sessões de estudo** e **gamificação**. As funções que você escrever são as mesmas regras que o backend vai ter, e o front-end já mostra esses números nas telas Dashboard e Metas.

Você só precisa do que viu no curso: variáveis, condicionais, `while` e `for`, listas, funções, módulos, dicionários, tuplas, arquivos, JSON e `datetime`. Os poucos conceitos novos aparecem explicados dentro da parte em que são usados.

## Como trabalhar

1. Leia a regra da parte.
2. Abra o arquivo indicado e escreva a função no lugar do `pass`.
3. Rode os testes daquela parte e veja o que falta.
4. Repita até a parte ficar verde, e só então vá para a próxima.

Antes de tudo, a cada terminal novo, guarde o caminho do Python do projeto:

```powershell
$py = "$env:LOCALAPPDATA\BuildInPublic\venv\Scripts\python.exe"
```

Para rodar os testes de uma parte, troque o número no final:

```powershell
& $py -m pytest exercicios/atividade_01 -k parte1
```

Para rodar tudo:

```powershell
& $py -m pytest exercicios/atividade_01
```

### Usando o VS Code, sem digitar comandos

1. **Abra a pasta do projeto:** **File → Open Folder** e escolha `Build_In_Public` (a raiz, não a subpasta `exercicios`).
2. **Instale a extensão Python** (da Microsoft), se o VS Code ainda não a tiver.
3. **Escolha o interpretador:** `Ctrl+Shift+P`, digite **Python: Select Interpreter** e escolha o `venv` de `BuildInPublic`. Se não aparecer na lista, use **Enter interpreter path... → Find...** e aponte para este arquivo:
   ```text
   C:\Users\gabri\AppData\Local\BuildInPublic\venv\Scripts\python.exe
   ```
   O VS Code já recebe essa configuração pela pasta `.vscode`, então talvez ele escolha sozinho.
4. **Rode os testes:** abra o painel **Testing** (ícone de béquer na barra lateral). Os testes aparecem em árvore. O botão ▶ ao lado de um item roda só aquele item: uma parte, um teste ou todos. Se a árvore ficar vazia, abra `Ctrl+Shift+P` e rode **Python: Configure Tests**, escolhendo pytest.
5. **Rode o programa (Parte 7):** abra o `app.py` e clique no botão ▶ no canto superior direito. O programa abre no painel **Terminal**, dentro do próprio VS Code. Ele precisa desse painel para usar `input()` e `print()`.

Quando um teste falha, clique nele no painel Testing para ver o valor esperado e o que a sua função devolveu.

**O que é o pytest:** um programa que chama as suas funções com valores combinados e compara o resultado com o esperado. Cada teste é uma função `test_...` que usa `assert`, que significa "isto precisa ser verdade". Quando falha, ele mostra o valor esperado e o que a sua função devolveu. Ler essa mensagem é a parte mais importante do trabalho.

**Regras:**
- Escreva apenas em `sessoes.py`, `armazenamento.py` e `app.py`.
- Não altere `test_atividade_01.py`: ele é a régua.
- Se travar, me mande o seu código e a mensagem do teste, e eu explico o que aconteceu. Não precisa de nada além do que está aqui.

## Parte 1: validar e criar a sessão

Arquivo: `sessoes.py`. Uma sessão é um dicionário:

```python
{"data": "2026-11-04", "minutos": 45, "tecnologia": "Python"}
```

**`validar_sessao(minutos, tecnologia)`** devolve uma **tupla** `(ok, mensagem)`:
- `minutos` precisa estar entre 1 e 1440 (um dia inteiro).
- `tecnologia` não pode ser vazia, nem ter só espaços.
- Se tudo estiver certo, devolva `(True, "")`. Senão, `(False, "um texto que explique o problema")`.

**`criar_sessao(data, minutos, tecnologia)`** devolve o dicionário acima. Recebe `data` como objeto `date`, e o dicionário guarda a data como texto. Remova os espaços das pontas da tecnologia.

Dicas: `str.strip()` e `date.isoformat()`.

**Onde aparece no app:** é o formulário "Registrar estudo". O backend repete essa validação, porque o front-end não é uma barreira de segurança.

## Parte 2: formatar a duração

**`formatar_duracao(minutos)`** transforma minutos em texto:

| Minutos | Texto |
|---|---|
| 135 | `2h 15min` |
| 45 | `45min` |
| 60 | `1h` |
| 0 | `0min` |

Dica: os operadores `//` (divisão inteira) e `%` (resto).

**Onde aparece no app:** o arquivo `frontend/src/lib/format.ts` faz exatamente isso, em TypeScript. Depois de terminar, compare a sua versão com a dele.

## Parte 3: somar o tempo

**`total_minutos(sessoes)`** soma os minutos de uma lista de sessões.

**`minutos_por_tecnologia(sessoes)`** devolve um dicionário com o total de cada tecnologia. `"Python"` e `"python"` são a mesma tecnologia, então somam juntas, e o nome usado é a grafia da **primeira** vez que ela aparece.

```python
# [{"tecnologia": "python", "minutos": 10}, {"tecnologia": "Python", "minutos": 5}]
# resulta em {"python": 15}
```

Dica: guarde também um dicionário auxiliar que relaciona o nome em minúsculas (`.lower()`) com a grafia original.

**Onde aparece no app:** é o gráfico "Tecnologias estudadas" do Dashboard.

## Parte 4: pontos e nível

**`xp_da_sessao(minutos)`**: 1 XP a cada 10 minutos, com mínimo de 1 e máximo de 30 por sessão.

| Minutos | XP |
|---|---|
| 5 | 1 |
| 25 | 2 |
| 60 | 6 |
| 300 | 30 |
| 1440 | 30 |

**`nivel_do_xp(xp)`** devolve o nível a partir do XP total:

| Nível | XP necessário |
|---|---|
| 1 | 0 |
| 2 | 100 |
| 3 | 300 |
| 4 | 600 |
| 5 | 1000 |
| 6 | 1500 |

Descubra o padrão da tabela e use um `while` para encontrar o nível. Não escreva uma condição para cada nível: os testes vão até o nível 10.

**Onde aparece no app:** é a tela Metas e evolução, na seção "Nível e conquistas". As regras ficam em funções pequenas e separadas porque assim são fáceis de testar.

## Parte 5: sequência de dias

**`sequencia_atual(sessoes, hoje)`** conta quantos dias seguidos você estudou. A sequência pode terminar **hoje ou ontem**: quem ainda não estudou hoje não perdeu a sequência. As sessões podem vir fora de ordem, e vários estudos no mesmo dia contam como um dia só.

Aqui entram três ideias novas:
- `date.fromisoformat("2026-11-04")` transforma o texto da sessão em um objeto `date`.
- `timedelta(days=1)` representa um dia de diferença: `hoje - timedelta(days=1)` é ontem.
- Para tirar dias repetidos, você pode usar uma lista e `in`, ou conhecer o `set`, que guarda cada valor uma só vez. Os dois resolvem.

**Onde aparece no app:** é a linha "dias seguidos de estudo" do Dashboard.

## Parte 6: guardar em arquivo

Arquivo: `armazenamento.py`.

**`salvar_sessoes(sessoes, caminho)`** grava a lista em JSON, trocando o conteúdo anterior.

**`carregar_sessoes(caminho)`** lê o arquivo e devolve a lista. Se o arquivo não existir, devolve uma lista vazia.

Dicas: `with open(...)`, `json.dump`, `json.load` e `os.path.exists`. Use `encoding="utf-8"` ao abrir o arquivo, porque no Windows o padrão é outro e acentos podem dar problema.

## Parte 7: o programa no terminal

Arquivo: `app.py`. Não tem teste automático: você roda e usa. Ele deve:

- Mostrar um menu em repetição até a pessoa escolher sair.
- **1. Registrar estudo:** pedir data (use a de hoje se ela apertar Enter), minutos e tecnologia, validar com `validar_sessao`, e mostrar o erro quando houver. Se estiver certo, criar, salvar e mostrar quanto XP ganhou.
- **2. Listar sessões:** a mais recente primeiro, com a duração formatada.
- **3. Resumo:** total de tempo, tempo por tecnologia, sequência atual, XP total e nível.
- **0. Sair.**

O arquivo `sessoes.json` fica na mesma pasta e não vai para o GitHub. Exemplo da tela de resumo:

```text
Total estudado: 3h 30min
Por tecnologia:
  Python: 2h 15min
  SQL: 1h 15min
Sequência atual: 3 dias
XP: 21 (nível 1)
```

Dica: um programa que mistura `input()`, `print()` e as regras fica difícil de testar. Por isso as regras estão em `sessoes.py`, e o `app.py` só conversa com a pessoa e chama as funções (`from sessoes import ...`).

## Parte 8: entrega

1. Rode todos os testes e confirme que estão verdes.
2. Use o programa de verdade por alguns dias, registrando o que você estuda.
3. Me mande o seu código e responda:
   - Qual parte foi a mais difícil, e por quê?
   - Algum teste falhou de um jeito que você não entendeu?

Eu reviso, explico os erros e atualizo o seu registro de aprendizagem. Depois dessa atividade, você terá usado na prática todo o conteúdo do curso, e o próximo passo será trocar o arquivo JSON por um banco de dados e expor essas regras em uma API.

## Desafios extras

1. Adicione a opção **excluir sessão** no menu, e veja o XP e o resumo se ajustarem sozinhos. Pense: por que é melhor calcular o XP a partir das sessões, em vez de guardar um número solto?
2. Adicione um filtro do resumo por tecnologia ou por período.
3. **Pergunta de projeto:** se o app tivesse também um Diário com "tempo dedicado", como evitar contar o mesmo tempo duas vezes? (É a pergunta final de `exercicios/diagnostico.py`.)
