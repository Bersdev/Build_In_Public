# Modelo de dados

**Estado: Planejado.** Nenhuma tabela foi criada neste repositório; o estudante vai criá-las passo a passo. Este modelo será revisado antes de cada migração.

## Regras gerais

- Toda tabela com dados de um usuário tem `user_id`, e toda consulta filtra por ele.
- Durações são minutos inteiros (`INTEGER`).
- Momentos exatos são guardados em UTC. O dia de estudo é uma data local, porque sequências dependem do fuso do usuário.
- Listas de opções fixas, como status e prioridade, usam `Enum` no Python.

## Entidades

| Entidade | Finalidade | Relacionamentos principais |
|---|---|---|
| `users` | Conta e perfil | Dona dos demais dados |
| `study_sessions` | Tempo de estudo | `user`, `technology` |
| `journal_entries` | Registros do Diário | `user`, `project` (opcional); N:N com `technologies`, `tags`, `categories` |
| `technologies` | Catálogo de linguagens e assuntos | N:N com Diário e projetos; referenciada por tarefas e sessões |
| `learning_paths` | Trilhas de estudo | `user`; 1:N com etapas |
| `learning_path_items` | Etapas e conteúdos | `learning_path`, `course` (opcional) |
| `courses` | Cursos externos | `user` |
| `projects` | Projetos do usuário | `user`; 1:N com tarefas e atualizações; N:N com `technologies` |
| `tasks` | Tarefas | `user`, `project` (opcional), `technology` (opcional) |
| `goals` | Metas | `user` |
| `achievements` | Catálogo de conquistas | N:N com usuários, via `user_achievements` |
| `user_achievements` | Conquistas obtidas | `user`, `achievement`, data de obtenção |

Ficam para a Etapa 5: `github_connections` e `ai_conversations`.

## Entidades acrescentadas à lista original

A especificação exige estes dados, mas eles não estavam na lista de entidades:

| Entidade | Por que é necessária |
|---|---|
| `tags`, `categories` | Filtros do Diário sem texto duplicado |
| `project_updates` | Histórico de atualizações do projeto |
| `activity_events` | Atividades recentes e linha do tempo |
| `xp_events` | XP como histórico auditável, não como número solto |
| `user_settings` | Preferências e aparência |
| `password_reset_tokens` | Recuperação de senha |
| `user_sessions` | Sessões de login, que podem ser encerradas no servidor |
| `learning_path_stages` | Etapas entre a trilha e os conteúdos |

## Decisão em aberto

**Tempo em dobro:** o Diário tem "tempo dedicado" e as sessões de estudo também têm duração. Se o Dashboard somar os dois, os totais ficam errados. A decisão será tomada na Etapa 2, depois da resposta do estudante à pergunta final de `exercicios/diagnostico.py`.
