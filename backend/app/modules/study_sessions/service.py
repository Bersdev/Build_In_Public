from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dates import reject_future
from app.core.errors import ValidationFailed
from app.modules.activity.service import record_activity
from app.modules.auth.models import User
from app.modules.catalog.models import Technology
from app.modules.catalog.service import get_or_create, get_owned
from app.modules.gamification import rules
from app.modules.gamification.service import evaluate_achievements, revoke_xp, sync_xp
from app.modules.study_sessions import schemas
from app.modules.study_sessions.models import StudySession


def _technology_id(db: Session, user_id: int, name: str | None) -> int | None:
    return get_or_create(db, Technology, user_id, name).id if name else None


def save_session_xp(db: Session, session: StudySession) -> None:
    db.flush()
    sync_xp(db, session.user_id, rules.STUDY_SESSION, session.id, rules.xp_for_study_session(session.duration_minutes))


def remove_session(db: Session, session: StudySession) -> None:
    revoke_xp(db, session.user_id, rules.STUDY_SESSION, session.id)
    db.delete(session)


def create(db: Session, user: User, data: schemas.StudySessionCreate) -> StudySession:
    reject_future(data.study_date, user.timezone)
    session = StudySession(
        user_id=user.id,
        study_date=data.study_date,
        duration_minutes=data.duration_minutes,
        notes=data.notes,
        technology_id=_technology_id(db, user.id, data.technology),
    )
    db.add(session)
    save_session_xp(db, session)
    subject = f" de {data.technology}" if data.technology else ""
    record_activity(
        db, user.id, "study_session", f"Estudo{subject}: {data.duration_minutes} min", "study_session", session.id
    )
    evaluate_achievements(db, user.id)
    db.commit()
    return session


def update(db: Session, user: User, session_id: int, data: schemas.StudySessionUpdate) -> StudySession:
    session = get_owned(db, StudySession, session_id, user.id)
    if session.journal_entry:
        raise ValidationFailed("Esta sessão veio do Diário. Edite o tempo no registro correspondente.")
    changes = data.changes()
    if "study_date" in changes:
        reject_future(changes["study_date"], user.timezone)
    if "technology" in changes:
        session.technology_id = _technology_id(db, user.id, changes.pop("technology"))
    for field, value in changes.items():
        setattr(session, field, value)
    save_session_xp(db, session)
    evaluate_achievements(db, user.id)
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, user: User, session_id: int) -> None:
    remove_session(db, get_owned(db, StudySession, session_id, user.id))
    db.commit()


def list_sessions(
    db: Session,
    user_id: int,
    technology: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = 200,
    offset: int = 0,
) -> list[StudySession]:
    query = select(StudySession).where(StudySession.user_id == user_id)
    if technology:
        query = query.join(StudySession.technology).where(Technology.normalized_name == technology.casefold())
    if date_from:
        query = query.where(StudySession.study_date >= date_from)
    if date_to:
        query = query.where(StudySession.study_date <= date_to)
    query = query.order_by(StudySession.study_date.desc(), StudySession.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(query))
