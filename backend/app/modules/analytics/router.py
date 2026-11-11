from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.database import Db
from app.core.schemas import Schema
from app.modules.auth.dependencies import CurrentUser
from app.modules.analytics import service
from app.modules.catalog.router import TechnologyRead
from app.modules.goals.schemas import GoalRead
from app.modules.projects.schemas import JournalSummary

router = APIRouter(tags=["Dashboard e evolução"])


class DailyPoint(Schema):
    date: date
    minutes: int


class WeeklyPoint(Schema):
    week_start: date
    minutes: int


class MonthlyPoint(Schema):
    month: str
    minutes: int


class ActivityRead(Schema):
    id: int
    kind: str
    title: str
    entity_type: str | None
    entity_id: int | None
    occurred_at: datetime


class DashboardRead(Schema):
    total_minutes: int
    week_minutes: int
    study_days: int
    projects_in_progress: int
    projects_completed: int
    tasks_pending: int
    current_goals: list[GoalRead]
    recent_activity: list[ActivityRead]
    technologies: list[TechnologyRead]
    daily_minutes: list[DailyPoint]
    weekly_minutes: list[WeeklyPoint]
    monthly_minutes: list[MonthlyPoint]
    recent_learnings: list[JournalSummary]
    xp: int
    level: int
    current_streak: int


class EvolutionRead(Schema):
    total_minutes: int
    study_days: int
    study_days_last_30: int
    goals_completed: int
    projects_completed: int
    technologies_explored: int
    weekly_minutes: list[WeeklyPoint]
    monthly_minutes: list[MonthlyPoint]


@router.get("/dashboard", response_model=DashboardRead)
def read_dashboard(db: Db, user: CurrentUser):
    return service.dashboard(db, user)


@router.get("/evolution", response_model=EvolutionRead)
def read_evolution(db: Db, user: CurrentUser):
    return service.evolution(db, user)


@router.get("/activity", response_model=list[ActivityRead])
def read_activity(
    db: Db,
    user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return service.list_activity(db, user.id, limit, offset)
