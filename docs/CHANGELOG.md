# Alterações

## 2026-11-11 (limite de tentativas)

### Adicionado

- Limite de tentativas guardado no banco (tabela `rate_limit_events`, migração `0002`), porque a API roda em funções serverless e um contador em memória não funcionaria. As chaves ficam só como hash.
- Login: 5 erros por e-mail + IP, 30 por IP e 50 por e-mail (somando todos os IPs) em 15 minutos bloqueiam novas tentativas (resposta 429 com `retry_after`), mesmo com a senha certa. Entrar com sucesso zera a contagem do e-mail.
- Cadastro: 20 por hora por IP. Recuperação de senha: 10 por hora por IP.
- Análise com IA: 120 chamadas por hora por usuário, para ninguém esgotar a cota da chave da Groq. O front só espera sozinho pausas de até 2 minutos (as da Groq); acima disso mostra a mensagem.

## 2026-11-11 (correção da importação com IA)

### Corrigido

- Arquivos grandes falhavam: o plano gratuito da Groq aceita 8 mil tokens por minuto. Agora a IA só classifica as linhas (metas, projetos, tarefas e quais colunas são título, etapa, link e notas) e a trilha é montada com o texto do próprio CSV. O arquivo é analisado em partes, com barra de progresso e espera automática quando a Groq pede pausa. Limite da análise: 150 mil caracteres.
- A tela mostrava "Não foi possível conectar à API" para qualquer erro 502/503; agora mostra a mensagem real da API.
- A IA não decide mais ignorar linhas (numa parte, ela chegou a ignorar todas); só repetições exatas do cabeçalho são puladas.
- Trilhas podem ter até 200 etapas (planos semanais de um ano têm 52). Quando há mais de uma coluna de agrupamento, a IA prefere a mais ampla (fase antes de semana).
- Sem nome sugerido pela IA, a trilha recebe o nome do arquivo.

## 2026-11-11 (noite)

### Adicionado

- Importação com IA (Groq): ao importar um CSV em Roadmaps, a IA separa conteúdos de estudo (trilha), metas, projetos e tarefas. A pessoa revisa, desmarca o que não quiser e confirma; cada item vai para a sua página. Rotas `GET /api/v1/imports/ai-status`, `POST /api/v1/imports/analyze` e `POST /api/v1/imports/apply`.
- Cliente da Groq em `backend/app/core/groq.py`, só com a biblioteca padrão, usando saída JSON estrita.
- Variáveis `GROQ_API_KEY` e `GROQ_MODEL`.

## 2026-11-11 (tarde)

### Adicionado

- Importar roadmap de um arquivo CSV (tela Roadmaps → "Importar CSV"). Uma linha por conteúdo; colunas `etapa`, `item`, `link` e `notas`, com só `item` obrigatória. Aceita vírgula ou ponto e vírgula, UTF-8 ou Windows-1252 (Excel em português) e nomes de coluna em português ou inglês. Erros apontam a linha, e nada é salvo se houver erro. Limites: 500 conteúdos, 50 etapas, 300 KB. Rota `POST /api/v1/learning-paths/import`.
- Modelo de CSV para baixar na própria tela.

### Corrigido

- Trocar a senha encerra as sessões dos outros aparelhos.

## 2026-11-11

### Adicionado

- Backend completo em `backend/` (antes guardado como gabarito), com suporte a PostgreSQL (`psycopg`).
- Landing page para visitantes: navegação, apresentação, recursos, como funciona, evolução, chamada para cadastro e rodapé.
- Publicação na Vercel com banco Neon gratuito: `vercel.json`, `api/index.py`, `requirements.txt` na raiz e `docs/DEPLOY.md`.

### Alterado

- Novo visual inspirado no estilo do Linear (styles.refero.design): fundo quase preto, bordas finas, Inter e JetBrains Mono, acento verde-limão. Menu lateral, botões, painéis, janelas, login e cadastro redesenhados.
- Escopo: a pedido do estudante, Claude passa a construir também o backend.
- Recuperação de senha avisa, em produção, que o envio de e-mail ainda não está ativo.

## 2026-11-05

### Adicionado

- Front-end completo: todas as páginas, tema escuro e claro, gráficos e responsividade.
- Node.js 26 instalado na máquina, necessário para o front-end.

### Alterado

- Regra de escopo corrigida: Claude constrói só o front-end; o estudante constrói o resto, passo a passo.
- Troca de `httpx` por `httpx2` nos testes da API.

### Corrigido

- Um backend completo foi construído por engano, por interpretação errada do escopo. Foi guardado fora do repositório como material de ensino, e `backend/` voltou a ter só `GET /health`.

## 2026-11-04

### Adicionado

- Repositório Git local, documentação inicial e especificação do produto.
- API mínima com `GET /health` e seu teste.
- Exercícios de diagnóstico adaptados ao conteúdo da FIAP.

