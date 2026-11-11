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

Ao gravar variáveis pelo PowerShell, use o Bash ou o painel: o PowerShell 5.1 coloca um caractere invisível (BOM) no início do valor.

## Publicar de novo

```bash
vercel deploy --prod
```

O projeto ainda não está ligado a um repositório no GitHub. Depois de publicar o repositório, conecte-o em **Project → Settings → Git** para publicar a cada push.

## Limitações conhecidas

- **Recuperação de senha:** não envia e-mail ainda. Precisa de um serviço como o Resend e de uma chave criada pelo dono da conta.
- **Primeira chamada após inatividade:** a função e o banco "acordam", e a primeira requisição pode levar 1 a 2 segundos.
