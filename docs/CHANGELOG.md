# Alterações

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

