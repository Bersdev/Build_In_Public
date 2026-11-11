from calendar import monthrange
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.dates import reject_future
from app.modules.activity.service import record_activity
from app.modules.auth.models import User
from app.modules.catalog.models import Category, Tag, Technology
from app.modules.catalog.service import get_or_create, get_or_create_many, get_owned
from app.modules.gamification import rules
from app.modules.gamification.service import evaluate_achievements, revoke_xp, sync_xp
from app.modules.journal import schemas
from app.modules.journal.models import JournalEntry
from app.modules.projects.models import Project
from app.modules.study_sessions.models import StudySession
from app.modules.study_sessions.service import remove_session, save_session_xp

_RELATION_MODELS = {"technologies": Technology, "tags": Tag, "categories": Category}
_SEARCH_FIELDS = ("title", "description", "difficulties", "errors", "solutions", "key_learnings")


def _session_technology_id(db: Session, entry: JournalEntry) -> int | None:
    if entry.technologies:
        return entry.technologies[0].id
    return get_or_create(db, Technology, entry.user_id, entry.language).id if entry.language else None


def _sync_session(db: Session, entry: JournalEntry, minutes: int | None) -> None:
    """Mantém uma única sessão ligada ao registro, para o tempo nunca ser contado em dobro."""
    session = entry.study_session
    if minutes is None:
        if session:
            entry.study_session = None
            db.flush()
            remove_session(db, session)
        return
    if session is None:
        session = StudySession(user_id=entry.user_id, study_date=entry.entry_date, duration_minutes=minutes)
        db.add(session)
        entry.study_session = session
    session.study_date = entry.entry_date
    session.duration_minutes = minutes
    session.technology_id = _session_technology_id(db, entry)
    save_session_xp(db, session)


def _apply(db: Session, entry: JournalEntry, changes: dict) -> None:
    if changes.get("project_id") is not None:
        get_owned(db, Project, changes["project_id"], entry.user_id)
    for field, model in _RELATION_MODELS.items():
        if field in changes:
            setattr(entry, field, get_or_create_many(db, model, entry.user_id, changes.pop(field)))
    for field, value in changes.items():
        setattr(entry, field, value)


def create(db: Session, user: User, data: schemas.JournalCreate) -> JournalEntry:
    reject_future(data.entry_date, user.timezone)
    changes = data.model_dump()
    minutes = changes.pop("duration_minutes")
    entry = JournalEntry(user_id=user.id, title=changes["title"], entry_date=changes["entry_date"])
    db.add(entry)
    _apply(db, entry, changes)
    db.flush()
    _sync_session(db, entry, minutes)
    sync_xp(db, user.id, rules.JOURNAL_ENTRY, entry.id, rules.XP_RULES[rules.JOURNAL_ENTRY])
    record_activity(db, user.id, "journal_entry", f"Diário: {entry.title}", "journal", entry.id)
    evaluate_achievements(db, user.id)
    db.commit()
    return entry


def update(db: Session, user: User, entry_id: int, data: schemas.JournalUpdate) -> JournalEntry:
    entry = get_owned(db, JournalEntry, entry_id, user.id)
    changes = data.changes()
    if "entry_date" in changes:
        reject_future(changes["entry_date"], user.timezone)
    minutes = changes.pop("duration_minutes", entry.duration_minutes)
    _apply(db, entry, changes)
    _sync_session(db, entry, minutes)
    evaluate_achievements(db, user.id)
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, user: User, entry_id: int) -> None:
    entry = get_owned(db, JournalEntry, entry_id, user.id)
    session = entry.study_session
    revoke_xp(db, user.id, rules.JOURNAL_ENTRY, entry.id)
    db.delete(entry)
    db.flush()
    if session:
        remove_session(db, session)
    db.commit()


def list_entries(
    db: Session,
    user_id: int,
    q: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    technology: str | None = None,
    tag: str | None = None,
    category: str | None = None,
    project_id: int | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[JournalEntry]:
    query = (
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .options(
            selectinload(JournalEntry.technologies),
            selectinload(JournalEntry.tags),
            selectinload(JournalEntry.categories),
            selectinload(JournalEntry.study_session),
            selectinload(JournalEntry.project),
        )
    )
    if q:
        # autoescape faz % e _ serem texto comum. Os valores vão como parâmetros, sem risco de SQL injection.
        query = query.where(
            or_(*(getattr(JournalEntry, field).icontains(q, autoescape=True) for field in _SEARCH_FIELDS))
        )
    if date_from:
        query = query.where(JournalEntry.entry_date >= date_from)
    if date_to:
        query = query.where(JournalEntry.entry_date <= date_to)
    if technology:
        query = query.where(JournalEntry.technologies.any(Technology.normalized_name == technology.casefold()))
    if tag:
        query = query.where(JournalEntry.tags.any(Tag.normalized_name == tag.casefold()))
    if category:
        query = query.where(JournalEntry.categories.any(Category.normalized_name == category.casefold()))
    if project_id:
        query = query.where(JournalEntry.project_id == project_id)
    query = query.order_by(JournalEntry.entry_date.desc(), JournalEntry.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(query))


def calendar(db: Session, user_id: int, year: int, month: int) -> list[dict]:
    first, last = date(year, month, 1), date(year, month, monthrange(year, month)[1])
    rows = db.execute(
        select(JournalEntry.entry_date, func.count())
        .where(JournalEntry.user_id == user_id, JournalEntry.entry_date.between(first, last))
        .group_by(JournalEntry.entry_date)
        .order_by(JournalEntry.entry_date)
    )
    return [{"date": day, "count": count} for day, count in rows]
