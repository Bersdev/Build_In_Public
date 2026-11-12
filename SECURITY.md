# Segurança

## Como reportar uma vulnerabilidade

Se encontrou uma falha, **não abra uma issue pública**. Use a aba *Security* → *Report a vulnerability* deste repositório no GitHub. Descreva o que encontrou e como reproduzir; a resposta vem em poucos dias.

## O que o app faz para se proteger

- Senhas com hash Argon2; sessões no servidor, com o token guardado só como hash; cookie `HttpOnly`, `Secure` e `SameSite=Lax`.
- Toda consulta filtra pelo usuário logado, e o backend valida e autoriza tudo (o front-end não é barreira).
- Limite de tentativas no login, cadastro, recuperação de senha, confirmação de senha e análise com IA; teto de escritas por pessoa.
- Requisições que alteram dados vindas de outro site são recusadas (verificação de `Origin`).
- Cabeçalhos: `Content-Security-Policy` restritiva, HSTS, `X-Frame-Options`, `nosniff`, `Permissions-Policy`. Respostas da API não ficam em cache.
- Segredos só em variáveis de ambiente. O Dependabot acompanha as dependências.

Detalhes e limites em [docs/DEPLOY.md](docs/DEPLOY.md).
