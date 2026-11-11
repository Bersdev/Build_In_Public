# Alterações

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

