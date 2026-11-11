"""Regras de pontuação. São funções puras: sem banco de dados, fáceis de testar."""

from datetime import date, timedelta

STUDY_SESSION = "study_session"
JOURNAL_ENTRY = "journal_entry"
TASK_COMPLETED = "task_completed"
PROJECT_COMPLETED = "project_completed"
GOAL_COMPLETED = "goal_completed"
ITEM_COMPLETED = "learning_item_completed"
COURSE_COMPLETED = "course_completed"

XP_RULES = {
    JOURNAL_ENTRY: 10,
    TASK_COMPLETED: 5,
    PROJECT_COMPLETED: 50,
    GOAL_COMPLETED: 30,
    ITEM_COMPLETED: 5,
    COURSE_COMPLETED: 20,
}

RULE_DESCRIPTIONS = [
    {"action": "Sessão de estudo", "xp": "1 XP a cada 10 minutos (mínimo 1, máximo 30 por sessão)"},
    {"action": "Registro no Diário", "xp": f"{XP_RULES[JOURNAL_ENTRY]} XP"},
    {"action": "Tarefa concluída", "xp": f"{XP_RULES[TASK_COMPLETED]} XP"},
    {"action": "Conteúdo de trilha concluído", "xp": f"{XP_RULES[ITEM_COMPLETED]} XP"},
    {"action": "Curso concluído", "xp": f"{XP_RULES[COURSE_COMPLETED]} XP"},
    {"action": "Meta concluída", "xp": f"{XP_RULES[GOAL_COMPLETED]} XP"},
    {"action": "Projeto concluído", "xp": f"{XP_RULES[PROJECT_COMPLETED]} XP"},
]

# (código, título, descrição, métrica, limite)
ACHIEVEMENTS = [
    ("first_session", "Primeiro passo", "Registrou o primeiro tempo de estudo", "has_studied", 1),
    ("hours_10", "10 horas", "Acumulou 10 horas de estudo", "study_hours", 10),
    ("hours_50", "50 horas", "Acumulou 50 horas de estudo", "study_hours", 50),
    ("hours_100", "100 horas", "Acumulou 100 horas de estudo", "study_hours", 100),
    ("entries_1", "Primeira anotação", "Criou o primeiro registro no Diário", "journal_entries", 1),
    ("entries_10", "Memória técnica", "Criou 10 registros no Diário", "journal_entries", 10),
    ("entries_50", "Arquivo pessoal", "Criou 50 registros no Diário", "journal_entries", 50),
    ("streak_3", "Ritmo", "Estudou 3 dias seguidos", "longest_streak", 3),
    ("streak_7", "Uma semana", "Estudou 7 dias seguidos", "longest_streak", 7),
    ("streak_30", "Um mês", "Estudou 30 dias seguidos", "longest_streak", 30),
    ("tasks_10", "Mão na massa", "Concluiu 10 tarefas", "tasks_completed", 10),
    ("tasks_50", "Execução", "Concluiu 50 tarefas", "tasks_completed", 50),
    ("project_1", "Projeto entregue", "Concluiu o primeiro projeto", "projects_completed", 1),
    ("project_3", "Portfólio", "Concluiu 3 projetos", "projects_completed", 3),
    ("goal_1", "Objetivo alcançado", "Concluiu a primeira meta", "goals_completed", 1),
    ("level_5", "Nível 5", "Alcançou o nível 5", "level", 5),
    ("level_10", "Nível 10", "Alcançou o nível 10", "level", 10),
]


def xp_for_study_session(minutes: int) -> int:
    return min(30, max(1, minutes // 10))


def xp_for_level(level: int) -> int:
    """XP total para alcançar um nível: 0, 100, 300, 600, 1000..."""
    return 50 * level * (level - 1)


def level_from_xp(xp: int) -> int:
    level = 1
    while xp >= xp_for_level(level + 1):
        level += 1
    return level


def current_streak(dates: list[date], today: date) -> int:
    """Dias seguidos terminando hoje ou ontem: quem não estudou hoje ainda não perdeu a sequência."""
    unique = set(dates)
    day = today if today in unique else today - timedelta(days=1)
    streak = 0
    while day in unique:
        streak += 1
        day -= timedelta(days=1)
    return streak


def longest_streak(dates: list[date]) -> int:
    longest = current = 0
    previous = None
    for day in sorted(set(dates)):
        current = current + 1 if previous and day - previous == timedelta(days=1) else 1
        longest = max(longest, current)
        previous = day
    return longest
