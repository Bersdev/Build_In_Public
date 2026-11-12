# Build in Public

**Documente sua jornada. Acompanhe sua evolução. Construa seu futuro.**

Plataforma web para estudantes e desenvolvedores registrarem e visualizarem a evolução no aprendizado de programação, conectando aprendizado, execução e evolução.

**App publicado:** https://build-in-public-rho.vercel.app

## Funcionalidades

- **Conta:** cadastro, login com sessão em cookie seguro, perfil, troca de senha (encerra as outras sessões) e exclusão da conta.
- **Dashboard:** resumo da semana, horas estudadas, sequência de dias e gráficos.
- **Estudos:** sessões de estudo com duração, tecnologias e cursos.
- **Diário:** registro do que foi aprendido, com busca e tags.
- **Roadmaps:** trilhas com etapas e conteúdos, progresso calculado a partir do que foi concluído.
- **Importação de CSV:** traz um roadmap pronto de um arquivo CSV. Com a IA ligada (Groq), o app separa conteúdos, metas, projetos e tarefas, mostra uma revisão e salva cada item na página certa.
- **Projetos e Tarefas:** projetos com status e tecnologias; tarefas em lista ou Kanban, com prioridade e prazo.
- **Metas:** horas na semana, horas no total, projetos ou cursos concluídos, ou metas manuais, com progresso calculado.
- **Evolução e gamificação:** XP, níveis, conquistas e histórico, sempre calculados a partir dos registros reais.
- Tema escuro e claro e layout para celular.

## Tecnologias

| Parte | Tecnologias |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, Alembic, Pydantic, pytest |
| Front-end | React, TypeScript, Vite, TanStack Query, Tailwind CSS, Vitest |
| Banco | SQLite no desenvolvimento, PostgreSQL (Neon) em produção |
| IA | Groq (modelo `openai/gpt-oss-120b`, saída JSON estrita) |
| Hospedagem | Vercel (front e API no mesmo endereço) |

## Estrutura

```
backend/
  app/main.py            # cria a aplicação
  app/core/              # configuração, banco, erros, segurança, cliente da Groq
  app/modules/<área>/    # router, schemas, models e service de cada área
  alembic/               # migrações
  tests/
frontend/src/
  components/            # componentes reutilizáveis
  lib/                   # API, tipos, formatação, CSV
  pages/                 # telas
api/index.py             # entrada da API na Vercel
docs/                    # documentação do projeto
exercicios/              # atividades de estudo
```

## Como executar

Requisitos: Windows com PowerShell, Python 3.15, Node.js 26 e Git. Execute os comandos a partir da raiz do projeto.

O ambiente virtual fica fora da pasta do projeto porque ela está no OneDrive, que tentaria sincronizar milhares de arquivos.

### Backend

**1. Criar o ambiente virtual (apenas uma vez)**

```powershell
python -m venv "$env:LOCALAPPDATA\BuildInPublic\venv"
```

**2. Guardar o caminho do Python do ambiente (em cada terminal novo)**

```powershell
$py = "$env:LOCALAPPDATA\BuildInPublic\venv\Scripts\python.exe"
```

**3. Instalar as dependências**

```powershell
& $py -m pip install -r backend\requirements-dev.txt
```

**4. Configurar (opcional)**

Copie `backend/.env.example` para `backend/.env`. Sem `.env`, o app usa SQLite em `%LOCALAPPDATA%\BuildInPublic`. Para a importação com IA, coloque sua chave em `GROQ_API_KEY`. O `.env` nunca vai para o GitHub.

**5. Criar as tabelas**

```powershell
& $py -m alembic -c backend\alembic.ini upgrade head
```

**6. Executar os testes**

```powershell
& $py -m pytest backend
```

**7. Iniciar a API**

```powershell
& $py -m uvicorn app.main:app --app-dir backend --reload
```

A documentação interativa fica em `http://127.0.0.1:8000/docs`.

### Front-end

**1. Instalar as dependências (apenas uma vez)**

```powershell
npm --prefix frontend install
```

**2. Executar os testes**

```powershell
npm --prefix frontend test
```

**3. Iniciar a interface**

```powershell
npm --prefix frontend run dev
```

Depois, abra `http://localhost:5173`. Mantenha a API rodando em outro terminal: o front-end encaminha as chamadas de `/api` para ela.

## Publicação

Cada push na `main` publica em produção na Vercel. O banco é um PostgreSQL gratuito da Neon, e as migrações rodam sozinhas na publicação. Variáveis de ambiente e limites estão em [docs/DEPLOY.md](docs/DEPLOY.md).

## Segurança

- Senhas guardadas só com hash; sessão em cookie `HttpOnly` e `Secure`.
- Toda consulta filtra pelo usuário logado; o backend valida e autoriza tudo.
- Segredos (banco, chave da Groq) só em variáveis de ambiente, nunca no código.

## Limitações conhecidas

- A recuperação de senha ainda não envia e-mail.
- Com a IA, arquivos grandes levam 1 a 2 minutos por causa do limite gratuito da Groq.

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Especificação completa do produto |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Etapas e estado de cada uma |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura e decisões técnicas |
| [docs/DATABASE.md](docs/DATABASE.md) | Modelo de dados |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Publicação, variáveis de ambiente e importação com IA |
| [docs/LEARNING_PROGRESS.md](docs/LEARNING_PROGRESS.md) | Conhecimentos estudados e aplicados |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Alterações importantes |

## Autor — Gabriel Bernardino (Gabriel Bernardino dos Santos)

Projeto desenvolvido por **Gabriel Bernardino** (**Gabriel Bernardino dos Santos**), 17 anos (nascido em 12/05/2009), desenvolvedor de software em formação e estudante de **Engenharia de Software na UniSenai** em **Londrina/PR**.

- **Área de atuação:** Desenvolvimento back-end com Python, FastAPI, análise de dados com pandas e IA aplicada.
- **Certificação:** Python Development — FIAP (80 horas).
- **Objetivo atual:** Buscando 1ª oportunidade em TI (Estágio ou Jovem Aprendiz, 100% remoto).
- **LinkedIn:** [linkedin.com/in/gabrielbersantos](https://www.linkedin.com/in/gabrielbersantos)
- **GitHub:** [github.com/Bersdev](https://github.com/Bersdev)
- **Site Oficial / Portfólio:** [bersdev.github.io](https://bersdev.github.io)
- **E-mail:** [bernardinogabriel68@gmail.com](mailto:bernardinogabriel68@gmail.com)
