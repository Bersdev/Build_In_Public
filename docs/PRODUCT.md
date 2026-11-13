# Especificação do produto

Fonte de verdade do que o DevTrack deve ser. O estado de cada item fica em [ROADMAP.md](ROADMAP.md).

## Visão

Plataforma web para acompanhar, organizar, registrar e visualizar a evolução de estudantes e desenvolvedores na jornada de aprendizado de programação. Conecta três dimensões:

- **Aprendizado:** o que o usuário está estudando e aprendendo.
- **Execução:** quais atividades realiza e quais projetos constrói.
- **Evolução:** quanto avançou, quais objetivos alcançou e como seu desenvolvimento mudou.

O diferencial é o histórico completo da jornada como desenvolvedor. Não é um aplicativo genérico de tarefas.

**Fora do produto:** musculação, academia, treinos, alimentação ou acompanhamento físico.

## Público-alvo

Iniciantes em programação, estudantes de tecnologia, universitários de Engenharia de Software e áreas relacionadas, autodidatas, pessoas em transição para tecnologia, desenvolvedores com projetos pessoais e quem deseja construir portfólio e documentar a evolução.

Uso inicialmente individual, com arquitetura pronta para várias contas com dados próprios.

## Funcionalidades

### Dashboard

Total de horas estudadas, horas na semana, dias com estudos registrados, projetos em andamento e concluídos, tarefas pendentes, metas atuais, atividades recentes, tecnologias estudadas, gráfico de horas de estudo, gráfico de evolução semanal e mensal, linha do tempo de atividades e resumo dos últimos aprendizados.

Usa dados reais dos módulos implementados. Nunca exibe números fictícios como reais.

### Diário de programação

Memória técnica pessoal.

- **Campos:** título, descrição, data, tempo dedicado, linguagem, tecnologia ou assunto, dificuldades, erros identificados, soluções, principais aprendizados, tags, categorias e projeto relacionado (opcional).
- **Ações:** criar, visualizar, editar, excluir, pesquisar, filtrar por data, filtrar por tecnologia, consultar histórico e visualizar em calendário.

### Estudos e roadmaps

Organiza estudos feitos em outras fontes; não hospeda cursos.

- **Ações:** criar trilhas e etapas, adicionar conteúdos, registrar links de referência, associar cursos, marcar conteúdos como concluídos, acompanhar progresso, definir início e previsão de conclusão e consultar tecnologias estudadas.
- **Exemplos de trilhas:** lógica de programação, Python, JavaScript, HTML e CSS, Git e GitHub, SQL, bancos de dados, back-end, front-end, APIs e estruturas de dados.

### Projetos

- **Campos:** nome, descrição, objetivo, imagem ou ícone, tecnologias, status, prioridade, data de início, prazo, percentual de conclusão, link do GitHub, link de demonstração, tarefas relacionadas, histórico de atualizações e aprendizados adquiridos.
- **Status:** Planejamento, Em andamento, Pausado, Concluído e Arquivado.
- Cada projeto tem página própria com detalhes, tarefas e histórico.

### Tarefas

- **Campos:** título, descrição, categoria, prioridade, data de criação, prazo, status, projeto relacionado e tecnologia relacionada.
- **Visualizações:** lista, Kanban (A fazer, Em andamento, Concluído), tarefas do dia, próximas, atrasadas e concluídas.
- **Ações:** criar, editar, concluir e excluir.

### Metas e evolução

- **Exemplos de metas:** estudar certa quantidade de horas por semana, finalizar um curso, concluir um projeto, aprender uma tecnologia, resolver exercícios e publicar um projeto no GitHub.
- **Indicadores, calculados de registros reais:** horas estudadas, frequência de estudos, metas concluídas, projetos finalizados, tecnologias exploradas, evolução mensal e histórico de atividades.

### Gamificação

XP, níveis, conquistas, marcos de evolução e sequências de estudos. Discreta, sem exageros nem tom infantil. Regras de pontuação explícitas, consistentes e testáveis.

### Perfil e configurações

- **Perfil:** nome, foto, biografia, objetivo profissional, tecnologias de interesse, nível de experiência e data de entrada.
- **Configurações:** dados pessoais, preferências, aparência, notificações, segurança, integrações e privacidade.

### Autenticação e usuários

Cadastro, login, logout, recuperação de senha, proteção de rotas, gerenciamento de sessão e perfil. Senha somente com hash apropriado. Cada usuário acessa apenas os próprios dados.

## Interface

Dark mode como padrão; minimalista, elegante e profissional, inspirada em Linear, Vercel, Raycast e Notion, sem copiá-los. Sidebar organizada, cards com contraste sutil, tipografia moderna, gráficos claros, componentes reutilizáveis e responsividade para desktop, tablet e celular.

**Páginas:** Login, Cadastro, Recuperação de senha, Dashboard, Diário, Estudos, Roadmaps, Projetos, Detalhes do projeto, Tarefas, Metas e evolução, Perfil e Configurações. As páginas GitHub e Assistente de IA dependem da Etapa 5.

## Integrações e SaaS (Etapas 5 e 6)

Registrado para preservar a visão. O estudante constrói estas partes, seguindo o passo a passo de Claude.

### Integração com GitHub

Conectar conta, consultar perfil, listar repositórios, consultar commits, mostrar atividade recente, gráfico de contribuições quando disponível, linguagens usadas e associação de repositórios a projetos. Respeitar a documentação oficial, não expor tokens no frontend nem no repositório e tratar erros, limites de requisições e estados de conexão.

### Assistente de IA

Resumir registros do Diário, analisar a evolução, identificar assuntos estudados, sugerir próximos conteúdos, organizar planos de estudos, gerar relatórios semanais e mensais, analisar dificuldades e transformar objetivos em tarefas. Exemplo: "Com base nos meus registros, o que estudei durante esta semana e quais assuntos preciso revisar?"

Enviar à IA só o contexto necessário, manter a chave no backend em variável de ambiente e não apresentar sugestões como fatos comprovados.

### Preparação para SaaS

Arquitetura multiusuário, separação de dados por usuário, planos Free e Pro, permissões, recursos premium, assinaturas, pagamentos, armazenamento em nuvem, sincronização entre dispositivos, monitoramento e escalabilidade. Não implementar pagamentos antes de um produto funcional e de uma decisão clara sobre o modelo comercial.

## Critérios de conclusão

O produto é funcional quando:

- Usuários criam conta e entram.
- Dados são persistidos corretamente.
- Os módulos principais estão conectados.
- O Diário permite operações completas.
- Estudos e roadmaps são gerenciáveis.
- Projetos têm tarefas relacionadas.
- Tarefas podem ser organizadas e atualizadas.
- Metas são acompanhadas.
- O Dashboard apresenta indicadores calculados a partir dos dados.
- A gamificação segue regras consistentes.
- Perfil e configurações funcionam.
- Integrações estão implementadas ou claramente identificadas como futuras.
- Os testes relevantes passam.
- A interface é responsiva.
- A documentação permite continuar o desenvolvimento.

Uma funcionalidade não está concluída apenas porque sua tela existe.
