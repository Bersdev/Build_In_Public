from datetime import date, timedelta

from app.core.dates import local_today
from app.modules.analytics import metrics

DASHBOARD = "/api/v1/dashboard"
HOJE = local_today("America/Sao_Paulo")


def test_serie_semanal_agrupa_de_segunda_a_domingo():
    # 2 de novembro de 2026 é uma segunda-feira.
    linhas = [(date(2026, 11, 2), 30), (date(2026, 11, 4), 30), (date(2026, 11, 1), 10)]
    serie = metrics.weekly_series(linhas, date(2026, 11, 4), weeks=2)
    assert serie == [
        {"week_start": date(2026, 10, 26), "minutes": 10},
        {"week_start": date(2026, 11, 2), "minutes": 60},
    ]


def test_serie_mensal_atravessa_a_virada_do_ano():
    linhas = [(date(2025, 12, 15), 20), (date(2026, 1, 3), 40), (date(2024, 1, 1), 999)]
    serie = metrics.monthly_series(linhas, date(2026, 1, 20), months=3)
    assert serie == [
        {"month": "2025-11", "minutes": 0},
        {"month": "2025-12", "minutes": 20},
        {"month": "2026-01", "minutes": 40},
    ]


def test_serie_diaria_preenche_dias_sem_estudo():
    serie = metrics.daily_series([(date(2026, 1, 3), 15)], date(2026, 1, 3), days=2)
    assert serie == [{"date": date(2026, 1, 2), "minutes": 0}, {"date": date(2026, 1, 3), "minutes": 15}]


def test_dashboard_sem_dados_mostra_zeros_e_nao_numeros_inventados(client):
    painel = client.get(DASHBOARD).json()
    assert painel["total_minutes"] == 0
    assert painel["week_minutes"] == 0
    assert painel["study_days"] == 0
    assert painel["projects_in_progress"] == 0
    assert painel["projects_completed"] == 0
    assert painel["tasks_pending"] == 0
    assert painel["current_goals"] == []
    assert painel["recent_activity"] == []
    assert painel["technologies"] == []
    assert painel["recent_learnings"] == []


def test_dashboard_calcula_indicadores_a_partir_dos_registros(client):
    hoje = HOJE.isoformat()
    antigo = (HOJE - timedelta(days=60)).isoformat()
    client.post("/api/v1/study-sessions", json={"study_date": hoje, "duration_minutes": 30, "technology": "Python"})
    client.post("/api/v1/study-sessions", json={"study_date": antigo, "duration_minutes": 60, "technology": "SQL"})
    client.post(
        "/api/v1/journal",
        json={
            "title": "Aprendi",
            "entry_date": hoje,
            "duration_minutes": 15,
            "technologies": ["Python"],
            "key_learnings": "Funções",
        },
    )
    client.post("/api/v1/projects", json={"name": "A", "status": "in_progress"})
    client.post("/api/v1/projects", json={"name": "B", "status": "completed"})
    client.post("/api/v1/tasks", json={"title": "Pendente"})
    client.post("/api/v1/tasks", json={"title": "Em andamento", "status": "in_progress"})
    client.post("/api/v1/tasks", json={"title": "Feita", "status": "done"})
    client.post("/api/v1/goals", json={"title": "Ativa", "target_value": 1})

    painel = client.get(DASHBOARD).json()
    # 30 + 60 + 15. O tempo do Diário entra uma única vez.
    assert painel["total_minutes"] == 105
    assert painel["week_minutes"] == 45
    assert painel["study_days"] == 2
    assert painel["projects_in_progress"] == 1
    assert painel["projects_completed"] == 1
    assert painel["tasks_pending"] == 2
    assert [g["title"] for g in painel["current_goals"]] == ["Ativa"]
    assert {t["name"]: t["study_minutes"] for t in painel["technologies"]} == {"Python": 45, "SQL": 60}
    assert painel["recent_learnings"][0]["key_learnings"] == "Funções"
    assert painel["recent_activity"]
    assert sum(p["minutes"] for p in painel["monthly_minutes"]) == 105
    assert len(painel["weekly_minutes"]) == 12
    assert len(painel["daily_minutes"]) == 30


def test_dias_de_estudo_incluem_registros_do_diario_sem_tempo(client):
    client.post("/api/v1/journal", json={"title": "Só anotação", "entry_date": HOJE.isoformat()})
    assert client.get(DASHBOARD).json()["study_days"] == 1


def test_evolucao_calcula_frequencia_e_totais(client):
    for atraso in (0, 1, 40):
        dia = (HOJE - timedelta(days=atraso)).isoformat()
        client.post("/api/v1/study-sessions", json={"study_date": dia, "duration_minutes": 60, "technology": "Python"})
    client.post("/api/v1/projects", json={"name": "A", "status": "completed"})
    meta = client.post("/api/v1/goals", json={"title": "M", "target_value": 1}).json()
    client.patch(f"/api/v1/goals/{meta['id']}", json={"completed": True})

    evolucao = client.get("/api/v1/evolution").json()
    assert evolucao["total_minutes"] == 180
    assert evolucao["study_days"] == 3
    assert evolucao["study_days_last_30"] == 2
    assert evolucao["goals_completed"] == 1
    assert evolucao["projects_completed"] == 1
    assert evolucao["technologies_explored"] == 1
    assert evolucao["monthly_minutes"]


def test_linha_do_tempo_mostra_o_mais_recente_primeiro_e_pagina(client):
    client.post("/api/v1/projects", json={"name": "Primeiro"})
    client.post("/api/v1/projects", json={"name": "Segundo"})
    atividades = client.get("/api/v1/activity").json()
    assert "Segundo" in atividades[0]["title"]
    assert "Primeiro" in atividades[1]["title"]
    assert len(client.get("/api/v1/activity", params={"limit": 1}).json()) == 1


def test_indicadores_nao_misturam_usuarios(client, other_client):
    client.post("/api/v1/study-sessions", json={"study_date": HOJE.isoformat(), "duration_minutes": 60})
    client.post("/api/v1/projects", json={"name": "Meu"})
    painel = other_client.get(DASHBOARD).json()
    assert painel["total_minutes"] == 0
    assert painel["projects_in_progress"] == 0
    assert painel["recent_activity"] == []
    assert other_client.get("/api/v1/activity").json() == []
    assert other_client.get("/api/v1/evolution").json()["total_minutes"] == 0


def test_indicadores_exigem_login(anonymous):
    for caminho in ("dashboard", "evolution", "activity", "gamification"):
        assert anonymous.get(f"/api/v1/{caminho}").status_code == 401
