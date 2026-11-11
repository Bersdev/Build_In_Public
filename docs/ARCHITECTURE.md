# Arquitetura

## Stack

| Camada | Tecnologia | Estado |
|---|---|---|
| Interface | React, TypeScript, Vite, Tailwind CSS, Lucide, TanStack Query, React Router | Em uso |
| Testes da interface | Vitest | Em uso |
| API | Python 3.15, FastAPI, Uvicorn | Em uso (só `/health`) |
| Testes da API | Pytest, httpx2 | Em uso |
| Validação | Pydantic | Instalado com o FastAPI; uso planejado |
| Banco | SQLAlchemy, Alembic, SQLite; PostgreSQL em produção | Planejado |

Componentes e gráficos são feitos à mão: barras simples não justificam uma biblioteca, e os componentes ficam reunidos em um só lugar.

## Estrutura

```text
Build_In_Public/
├── frontend/                # pronto
│   └── src/
│       ├── components/      # componentes reutilizáveis, navegação, gráfico
│       ├── lib/             # chamadas à API, tipos, formatação
│       └── pages/           # uma página por área do produto
├── backend/                 # em construção pelo estudante
│   ├── app/
│   │   ├── main.py          # cria a aplicação e registra as rotas
│   │   ├── core/            # planejado: configuração, banco, segurança, erros
│   │   └── modules/         # planejado: uma pasta por área do produto
│   │       └── journal/
│   │           ├── router.py    # recebe e responde HTTP
│   │           ├── schemas.py   # valida entrada e saída
│   │           ├── models.py    # tabelas do banco
│   │           └── service.py   # regras de negócio
│   ├── alembic/             # planejado: migrações
│   ├── tests/
│   ├── requirements.txt     # dependências de execução
│   └── requirements-dev.txt # dependências de desenvolvimento
├── docs/
└── exercicios/
```

Uma requisição percorre: `router → schema → service → model → banco`.

## Como as duas partes conversam

O navegador só fala com o Vite, que encaminha `/api` para `http://127.0.0.1:8000`. Assim, o cookie de sessão fica na mesma origem e a API não precisa liberar CORS.

O contrato que o backend precisa cumprir está em `frontend/src/lib/types.ts` (formato dos dados) e nas chamadas de `frontend/src/pages/` (rotas).

## Backend

O backend completo está em `backend/`, com 131 testes. Localmente usa SQLite em `%LOCALAPPDATA%\BuildInPublic`; em produção usa o PostgreSQL da Neon (`DATABASE_URL`). A publicação está descrita em `DEPLOY.md`.

## Decisões

1. **Separar por área do produto, não por tipo de arquivo.** Com muitos módulos, tudo sobre o Diário fica em uma pasta só.
2. **Sem camada de repositório no início.** O `service` acessa o banco diretamente. Essa camada só entra se surgir repetição real.
3. **`user_id` em todas as tabelas de dados do usuário desde a primeira migração.** É o que prepara o produto para vários usuários.
4. **Autenticação antes dos demais módulos.** O front-end exige login em todas as telas, e cada módulo depende do usuário logado.
5. **Rotas síncronas (`def`) no início.** `async` entra quando houver motivo real.
6. **Métricas calculadas, nunca digitadas.** Duração em minutos inteiros; Dashboard calculado a partir dos registros; XP guardado como histórico de eventos.
7. **Sessão em cookie `HttpOnly`,** inacessível ao JavaScript, com o token guardado só como hash no banco.

## Pontos de atenção

- **OneDrive:** o projeto está em uma pasta sincronizada, e isso pode travar ou corromper arquivos em uso. Por isso o ambiente virtual e o SQLite ficam em `%LOCALAPPDATA%\BuildInPublic`. A `.git` continua exposta a esse risco; mover o projeto eliminaria o problema.
- **SQLite e PostgreSQL:** o SQLite não aplica chaves estrangeiras por padrão (exige `PRAGMA foreign_keys=ON`) e é mais permissivo com tipos. Os testes automáticos rodam em SQLite; no PostgreSQL foram verificados as migrações e um teste de ponta a ponta em produção (cadastro, login, sessão de estudo, Dashboard, gamificação, exclusão de conta).
- **Limitações conhecidas:** foto e imagem de projeto são endereços da web, sem envio de arquivo. Login e cadastro ainda não têm limite de tentativas. A busca do SQLite ignora maiúsculas só em letras sem acento.
