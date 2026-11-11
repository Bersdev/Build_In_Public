from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import utcnow
from app.core.dates import local_today, reject_inverted_dates
from app.core.enums import CourseStatus, GoalKind, ProjectStatus
from app.modules.activity.service import record_activity
from app.modules.auth.models import User
from app.modules.catalog.service import get_owned
from app.modules.gamification import rules
from app.modules.gamification.service import evaluate_achievements, revoke_xp, sync_xp
from app.modules.goals import schemas
from app.modules.goals.models import Goal
from app.modules.learning.models import Course
from app.modules.projects.models import Project
from app.modules.study_sessions.models import StudySession


def _study_hours(db: Session, user_id: int, *conditions) -> float:
    minutes = db.scalar(
        select(func.coalesce(func.sum(StudySession.duration_minutes), 0)).where(
            StudySession.user_id == user_id, *conditions
        )
    )
    return minutes / 60


def _count(db: Session, model, *conditions) -> int:
    return db.scalar(select(func.count()).select_from(model).where(*conditions))


def current_value(db: Session, user: User, goal: Goal) -> float:
    if goal.kind == GoalKind.WEEKLY_STUDY_HOURS:
        today = local_today(user.timezone)
        monday = today - timedelta(days=today.weekday())
        return _study_hours(db, user.id, StudySession.study_date >= monday, StudySession.study_date <= today)
    if goal.kind == GoalKind.TOTAL_STUDY_HOURS:
        return _study_hours(db, user.id)
    if goal.kind == GoalKind.COMPLETED_PROJECTS:
        return _count(db, Project, Project.user_id == user.id, Project.status == ProjectStatus.COMPLETED)
    if goal.kind == GoalKind.COMPLETED_COURSES:
        return _count(db, Course, Course.user_id == user.id, Course.status == CourseStatus.COMPLETED)
    return goal.manual_value


def to_read(db: Session, user: User, goal: Goal) -> dict:
    value = current_value(db, user, goal)
    return {
        "id": goal.id,
        "title": goal.title,
        "description": goal.description,
        "kind": goal.kind,
        "target_value": goal.target_value,
        "manual_value": goal.manual_value,
        "start_date": goal.start_date,
        "due_date": goal.due_date,
        "completed_at": goal.completed_at,
        "created_at": goal.created_at,
        "current_value": round(value, 2),
        "progress_percent": min(100, round(value * 100 / goal.target_value)),
        "is_reached": value >= goal.target_value,
    }


def create(db: Session, user: User, data: schemas.GoalCreate) -> dict:
    reject_inverted_dates(data.start_date, data.due_date)
    goal = Goal(user_id=user.id, **data.model_dump())
    db.add(goal)
    db.commit()
    return to_read(db, user, goal)


def update(db: Session, user: User, goal_id: int, data: schemas.GoalUpdate) -> dict:
    goal = get_owned(db, Goal, goal_id, user.id)
    changes = data.changes()
    completed = changes.pop("completed", None)
    for field, value in changes.items():
        setattr(goal, field, value)
    reject_inverted_dates(goal.start_date, goal.due_date)
    if completed is True and goal.completed_at is None:
        goal.completed_at = utcnow()
        sync_xp(db, user.id, rules.GOAL_COMPLETED, goal.id, rules.XP_RULES[rules.GOAL_COMPLETED])
        record_activity(db, user.id, "goal_completed", f"Meta concluída: {goal.title}", "goal", goal.id)
    elif completed is False and goal.completed_at is not None:
        goal.completed_at = None
        revoke_xp(db, user.id, rules.GOAL_COMPLETED, goal.id)
    evaluate_achievements(db, user.id)
    db.commit()
    return to_read(db, user, goal)


def delete_goal(db: Session, user: User, goal_id: int) -> None:
    goal = get_owned(db, Goal, goal_id, user.id)
    revoke_xp(db, user.id, rules.GOAL_COMPLETED, goal.id)
    db.delete(goal)
    db.commit()


def list_goals(db: Session, user: User, active: bool | None = None) -> list[dict]:
    query = select(Goal).where(Goal.user_id == user.id)
    if active is True:
        query = query.where(Goal.completed_at.is_(None))
    elif active is False:
        query = query.where(Goal.completed_at.is_not(None))
    goals = db.scalars(query.order_by(Goal.due_date.is_(None), Goal.due_date, Goal.id))
    return [to_read(db, user, goal) for goal in goals]
