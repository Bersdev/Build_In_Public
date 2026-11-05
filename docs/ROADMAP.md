# Roadmap

**Estados:** Planejado, Em desenvolvimento, Implementado, Testado, Validado.

**Quem constrói:** o front-end é feito por Claude. Todo o resto é feito pelo estudante, seguindo um passo a passo de Claude, como aprendizado.

| Etapa | Conteúdo | Quem constrói | Estado |
|---|---|---|---|
| 0 | Diagnóstico e planejamento | Claude | Implementado |
| 1 | Ambiente, repositório, estrutura e fundamentos | Claude e estudante | Em desenvolvimento |
| 2 | Base do backend, autenticação, sessões de estudo e Diário | Estudante | Planejado |
| 3 | Demais módulos do backend | Estudante | Planejado |
| 4 | Front-end | Claude | Testado |
| 5 | GitHub, IA, relatórios, notificações e análises | Estudante | Planejado |
| 6 | Preparação para SaaS | Estudante | Planejado |

A Etapa 4 foi feita antes das Etapas 2 e 3. As telas só voltam a funcionar conforme cada módulo do backend for construído.

## Etapa 1: ambiente e fundamentos

| Item | Estado |
|---|---|
| Repositório Git local (branch `main`) | Implementado |
| Ambiente virtual e dependências fixadas | Implementado |
| Documentação inicial | Implementado |
| API mínima com `GET /health` | Testado |
| Primeiro commit e publicação no GitHub | Planejado (feito pelo estudante) |
| Exercícios de diagnóstico | Em desenvolvimento (aguardando o estudante) |

## Etapas 2 e 3: backend, passo a passo

Cada passo segue o mesmo ciclo: Claude explica o conceito e o código de referência, o estudante escreve a sua versão, os testes confirmam e Claude revisa. A coluna "Telas" mostra o que passa a funcionar ao final.

| Passo | Módulo | Conceitos novos | Telas |
|---|---|---|---|
| Antes de começar | Aulas e exercícios | HTTP e APIs, type hints, exceções, classes, decorators, `pytest` | Nenhuma |
| 1 | Base: configuração, banco, erros, schemas | SQL, SQLAlchemy, Pydantic, Alembic, `yield` | Nenhuma |
| 2 | Autenticação e perfil | Hash de senha, sessões, cookies, autorização | Login, Cadastro, Recuperação de senha, Perfil, Configurações |
| 3 | Sessões de estudo e catálogo | CRUD, relacionamentos, filtros | Estudos (sessões) |
| 4 | Diário | Muitos para muitos, busca, regra do tempo único | Diário |
| 5 | Projetos | Enum, histórico, dados entre usuários | Projetos, Detalhes do projeto |
| 6 | Tarefas | Consultas por prazo, fuso horário | Tarefas |
| 7 | Cursos e roadmaps | Dados aninhados, progresso calculado | Estudos (cursos), Roadmaps |
| 8 | Metas | Valores calculados | Metas |
| 9 | Gamificação | Funções puras, histórico de XP | Nível e conquistas |
| 10 | Dashboard e evolução | Agregações, `GROUP BY` | Dashboard, Evolução |

A gamificação entra no passo 9, voltando aos módulos anteriores para somar os pontos. As telas que dependem de rotas futuras mostram erro até lá.

## Etapa 4: front-end

| Item | Estado |
|---|---|
| Tema escuro e claro, componentes base e navegação | Testado |
| Login, Cadastro, Recuperação de senha | Testado |
| Dashboard com gráficos | Testado |
| Diário, Estudos, Roadmaps | Testado |
| Projetos, Detalhes do projeto, Tarefas (lista e Kanban) | Testado |
| Metas, Evolução e Gamificação | Testado |
| Perfil e Configurações | Testado |
| Responsividade (largura de celular) | Testado |
| Arrastar no Kanban com mouse | Implementado (lógica testada com eventos simulados; falta testar com mouse real) |

As telas foram testadas no navegador contra o backend de referência, não contra o backend do estudante. "Validado" fica para quando funcionarem com ele.

## Etapa 5: integrações avançadas

GitHub, assistente de IA, relatórios, notificações e análises avançadas. O envio de e-mail, necessário para a recuperação de senha em produção, entra aqui.

## Etapa 6: preparação para SaaS

Segurança, permissões, planos, recursos premium, infraestrutura, monitoramento e escalabilidade.
