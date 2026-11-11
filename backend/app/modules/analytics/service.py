from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.dates import local_today
from app.core.enums import ProjectStatus, TaskStatus
from app.modules.activity.models import ActivityEvent
from app.modules.analytics import metrics
from app.modules.auth.models import User
from app.modules.catalog.router import technology_summary
from app.modules.gamification import service as gamification
from app.modules.goals.models import Goal
from app.modules.goals.service import list_goals
from app.modules.journal.models import JournalEntry
from app.modules.projects.models import Project
from app.modules.study_sessions.models import StudySession
from app.modules.tasks.models import Task


def _count(db: Session, model, *conditions) -> int:
    return db.scalar(select(func.count()).select_from(model).where(*conditions))


def _study_rows(db: Session, user_id: int) -> list[tuple]:
    return [
        tuple(row)
        for row in db.execute(
            select(StudySession.study_date, StudySession.duration_minutes).where(StudySession.user_id == user_id)
        )
    ]


def _projects_with_status(db: Session, user_id: int, status: ProjectStatus) -> int:
    return _count(db, Project, Project.user_id == user_id, Project.status == status)


def list_activity(db: Session, user_id: int, limit: int = 30, offset: int = 0) -> list[ActivityEvent]:
    return list(
        db.scalars(
            select(ActivityEvent)
            .where(ActivityEvent.user_id == user_id)
            .order_by(ActivityEvent.occurred_at.desc(), ActivityEvent.id.desc())
            .limit(limit)
            .offset(offset)
        )
    )


def dashboard(db: Session, user: User) -> dict:
    today = local_today(user.timezone)
    rows = _study_rows(db, user.id)
    monday = metrics.week_start(today)
    learnings = db.scalars(
        select(JournalEntry)
        .where(JournalEntry.user_id == user.id, JournalEntry.key_learnings.is_not(None), JournalEntry.key_learnings != "")
        .order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc())
        .limit(5)
    )
    state = gamification.status(db, user)
    return {
        "total_minutes": sum(minutes for _, minutes in rows),
        "week_minutes": sum(minutes for day, minutes in rows if monday <= day <= today),
        "study_days": len(gamification.study_dates(db, user.id)),
        "projects_in_progress": _projects_with_status(db, user.id, ProjectStatus.IN_PROGRESS),
        "projects_completed": _projects_with_status(db, user.id, ProjectStatus.COMPLETED),
        "tasks_pending": _count(db, Task, Task.user_id == user.id, Task.status != TaskStatus.DONE),
        "current_goals": list_goals(db, user, active=True)[:5],
        "recent_activity": list_activity(db, user.id, limit=10),
        "technologies": [t for t in technology_summary(db, user.id) if t["study_minutes"] or t["journal_entries"]],
        "daily_minutes": metrics.daily_series(rows, today),
        "weekly_minutes": metrics.weekly_series(rows, today),
        "monthly_minutes": metrics.monthly_series(rows, today),
        "recent_learnings": list(learnings),
        "xp": state["xp"],
        "level": state["level"],
        "current_streak": state["current_streak"],
    }


def evolution(db: Session, user: User) -> dict:
    today = local_today(user.timezone)
    rows = _study_rows(db, user.id)
    dates = gamification.study_dates(db, user.id)
    since = today - timedelta(days=29)
    return {
        "total_minutes": sum(minutes for _, minutes in rows),
        "study_days": len(dates),
        "study_days_last_30": sum(1 for day in dates if since <= day <= today),
        "goals_completed": _count(db, Goal, Goal.user_id == user.id, Goal.completed_at.is_not(None)),
        "projects_completed": _projects_with_status(db, user.id, ProjectStatus.COMPLETED),
        "technologies_explored": sum(
            1 for t in technology_summary(db, user.id) if t["study_minutes"] or t["journal_entries"] or t["projects"]
        ),
        "weekly_minutes": metrics.weekly_series(rows, today),
        "monthly_minutes": metrics.monthly_series(rows, today),
    }
