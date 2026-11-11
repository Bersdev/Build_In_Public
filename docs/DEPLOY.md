# Publicação

Endereço: https://build-in-public-rho.vercel.app

## Como está montado

| Parte | Onde | Plano |
|---|---|---|
| Front-end (React, arquivos estáticos de `frontend/dist`) | Vercel | Hobby (grátis) |
| API (FastAPI, função Python em `api/index.py`) | Vercel, mesma URL, em `/api/*` | Hobby (grátis) |
| Banco PostgreSQL | Neon, contratado pelo Marketplace da Vercel | Free |

Front e API no mesmo endereço: o cookie de sessão (HttpOnly, Secure) funciona sem CORS.

A Railway foi descartada porque o plano gratuito dá poucos créditos por mês; uma API e um banco ligados o tempo todo passariam do limite.

## Arquivos

- `vercel.json`: build do front, rewrites (`/api/*` vai para a função, o resto para `index.html`), região `gru1` e cabeçalhos de segurança.
- `api/index.py`: importa `backend/app/main.py` e, em produção, aplica as migrações do Alembic com uma trava (`pg_advisory_lock`) para duas instâncias não migrarem ao mesmo tempo.
- `requirements.txt` (raiz): dependências que a Vercel instala. `backend/requirements.txt` aponta para ele.
- `.vercelignore`: deixa fora `exercicios/`, `docs/`, testes e segredos.

## Variáveis de ambiente (painel da Vercel)

| Nome | Valor |
|---|---|
| `DATABASE_URL` | Criada pela integração da Neon |
| `ENVIRONMENT` | `production` |
| `COOKIE_SECURE` | `true` |
| `FRONTEND_URL` | `https://build-in-public-rho.vercel.app` |
| `GROQ_API_KEY` | Chave da Groq (console.groq.com → API Keys). Marque como **Sensitive**. Sem ela, a importação com IA fica desligada e a simples continua funcionando. |
| `GROQ_MODEL` | Opcional. Padrão: `openai/gpt-oss-120b` (precisa aceitar saída estruturada estrita). |

Variáveis novas só valem a partir da próxima publicação (um push na `main` ou **Redeploy** no painel).

## Importação com IA

Fluxo: o CSV vai para `POST /api/v1/imports/analyze`, o backend pede à Groq um plano em JSON estrito (trilha, metas, projetos e tarefas), limpa o que vier inválido e devolve para revisão. Nada é salvo nessa etapa. A pessoa desmarca o que não quiser e confirma em `POST /api/v1/imports/apply`, que valida tudo de novo e salva numa única transação.

- A chave fica só no backend. O conteúdo do CSV é enviado à Groq; a tela avisa isso.
- Tudo entra como não concluído. Progresso, XP e evolução continuam vindo dos registros reais.
- Limite da análise: 60 mil caracteres por arquivo. A função tem até 60 segundos (`maxDuration`).

Ao gravar variáveis pelo PowerShell, use o Bash ou o painel: o PowerShell 5.1 coloca um caractere invisível (BOM) no início do valor.

## Publicar de novo

O projeto está ligado ao repositório `Bersdev/Build_In_Public`. Cada push na `main` publica em produção; push em outra branch gera uma versão de prévia com endereço próprio.

Para publicar sem passar pelo GitHub:

```bash
vercel deploy --prod
```

## Limitações conhecidas

- **Recuperação de senha:** não envia e-mail ainda. Precisa de um serviço como o Resend e de uma chave criada pelo dono da conta.
- **Primeira chamada após inatividade:** a função e o banco "acordam", e a primeira requisição pode levar 1 a 2 segundos.
