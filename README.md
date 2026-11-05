# Build in Public

**Documente sua jornada. Acompanhe sua evolução. Construa seu futuro.**

Plataforma web para estudantes e desenvolvedores registrarem e visualizarem a evolução no aprendizado de programação, conectando aprendizado, execução e evolução.

## Estado atual

- **Front-end:** todas as telas construídas.
- **Backend:** só a rota `GET /health`. O restante está sendo construído passo a passo, como aprendizado.

Por isso, as telas ainda não funcionam com a API deste repositório. O progresso real está em [docs/ROADMAP.md](docs/ROADMAP.md).

## Como executar

Requisitos: Windows com PowerShell, Python 3.15, Node.js 26 e Git.

O ambiente virtual fica fora da pasta do projeto porque ela está no OneDrive, que tentaria sincronizar milhares de arquivos. Execute a partir da raiz do projeto.

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

**4. Executar os testes**

```powershell
& $py -m pytest backend
```

**5. Iniciar a API**

```powershell
& $py -m uvicorn app.main:app --app-dir backend --reload
```

A documentação interativa fica em `http://127.0.0.1:8000/docs`. No PyCharm, selecione como interpretador o `python.exe` indicado no passo 2.

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

## Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/PRODUCT.md](docs/PRODUCT.md) | Especificação completa do produto |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Etapas e estado de cada uma |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura e decisões técnicas |
| [docs/DATABASE.md](docs/DATABASE.md) | Modelo de dados planejado |
| [docs/LEARNING_PROGRESS.md](docs/LEARNING_PROGRESS.md) | Conhecimentos estudados e aplicados |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Alterações importantes |
