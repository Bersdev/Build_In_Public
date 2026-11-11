from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.dates import local_today
from app.core.enums import ProjectStatus, TaskStatus
from app.modules.activity.service import record_activity
from app.modules.auth.models import User
from app.modules.gamification import rules
from app.modules.gamification.models import Achievement, UserAchievement, XpEvent
from app.modules.goals.models import Goal
from app.modules.journal.models import JournalEntry
from app.modules.projects.models import Project
from app.modules.study_sessions.models import StudySession
from app.modules.tasks.models import Task


def sync_xp(db: Session, user_id: int, rule: str, source_id: int, xp: int) -> None:
    """Cria ou atualiza os pontos de um registro. Nunca conta o mesmo registro duas vezes."""
    event = db.scalar(
        select(XpEvent).where(XpEvent.user_id == user_id, XpEvent.rule == rule, XpEvent.source_id == source_id)
    )
    if event:
        event.xp = xp
    else:
        db.add(XpEvent(user_id=user_id, rule=rule, source_id=source_id, xp=xp))


def revoke_xp(db: Session, user_id: int, rule: str, source_id: int) -> None:
    db.execute(
        delete(XpEvent).where(XpEvent.user_id == user_id, XpEvent.rule == rule, XpEvent.source_id == source_id)
    )


def total_xp(db: Session, user_id: int) -> int:
    return db.scalar(select(func.coalesce(func.sum(XpEvent.xp), 0)).where(XpEvent.user_id == user_id))


def study_dates(db: Session, user_id: int) -> list:
    sessions = db.scalars(select(StudySession.study_date).where(StudySession.user_id == user_id))
    entries = db.scalars(select(JournalEntry.entry_date).where(JournalEntry.user_id == user_id))
    return list({*sessions, *entries})


def _count(db: Session, model, *conditions) -> int:
    return db.scalar(select(func.count()).select_from(model).where(*conditions))


def metrics(db: Session, user_id: int) -> dict[str, int]:
    minutes = db.scalar(
        select(func.coalesce(func.sum(StudySession.duration_minutes), 0)).where(StudySession.user_id == user_id)
    )
    return {
        "study_hours": minutes // 60,
        "has_studied": 1 if minutes > 0 else 0,
        "journal_entries": _count(db, JournalEntry, JournalEntry.user_id == user_id),
        "longest_streak": rules.longest_streak(study_dates(db, user_id)),
        "tasks_completed": _count(db, Task, Task.user_id == user_id, Task.status == TaskStatus.DONE),
        "projects_completed": _count(
            db, Project, Project.user_id == user_id, Project.status == ProjectStatus.COMPLETED
        ),
        "goals_completed": _count(db, Goal, Goal.user_id == user_id, Goal.completed_at.is_not(None)),
        "level": rules.level_from_xp(total_xp(db, user_id)),
    }


def _catalog(db: Session) -> list[Achievement]:
    existing = {a.code: a for a in db.scalars(select(Achievement))}
    for code, title, description, metric, threshold in rules.ACHIEVEMENTS:
        if code not in existing:
            existing[code] = Achievement(
                code=code, title=title, description=description, metric=metric, threshold=threshold
            )
            db.add(existing[code])
    db.flush()
    return list(existing.values())


def evaluate_achievements(db: Session, user_id: int) -> None:
    """Conquistas são permanentes: uma vez obtidas, não são retiradas."""
    values = metrics(db, user_id)
    unlocked = set(db.scalars(select(UserAchievement.achievement_id).where(UserAchievement.user_id == user_id)))
    for achievement in _catalog(db):
        if achievement.id not in unlocked and values[achievement.metric] >= achievement.threshold:
            db.add(UserAchievement(user_id=user_id, achievement_id=achievement.id))
            record_activity(db, user_id, "achievement_unlocked", f"Conquista: {achievement.title}")


def status(db: Session, user: User) -> dict:
    xp = total_xp(db, user.id)
    level = rules.level_from_xp(xp)
    dates = study_dates(db, user.id)
    values = metrics(db, user.id)
    unlocked = {
        item.achievement_id: item.unlocked_at
        for item in db.scalars(select(UserAchievement).where(UserAchievement.user_id == user.id))
    }
    achievements = [
        {
            "code": a.code,
            "title": a.title,
            "description": a.description,
            "threshold": a.threshold,
            "current": min(values[a.metric], a.threshold),
            "unlocked_at": unlocked.get(a.id),
        }
        for a in _catalog(db)
    ]
    db.commit()
    return {
        "xp": xp,
        "level": level,
        "level_start_xp": rules.xp_for_level(level),
        "next_level_xp": rules.xp_for_level(level + 1),
        "current_streak": rules.current_streak(dates, local_today(user.timezone)),
        "longest_streak": values["longest_streak"],
        "achievements": achievements,
        "rules": rules.RULE_DESCRIPTIONS,
    }
