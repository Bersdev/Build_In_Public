from fastapi import APIRouter
from sqlalchemy import func, select

from app.core.database import Db
from app.core.schemas import Schema
from app.modules.auth.dependencies import CurrentUser
from app.modules.catalog.models import Category, Tag, Technology
from app.modules.journal.models import JournalEntry, journal_technologies
from app.modules.projects.models import Project, project_technologies
from app.modules.study_sessions.models import StudySession

router = APIRouter(tags=["Catálogo"])


class TechnologyRead(Schema):
    id: int
    name: str
    study_minutes: int
    journal_entries: int
    projects: int


def technology_summary(db, user_id: int) -> list[dict]:
    """Quanto cada tecnologia foi usada, calculado a partir dos registros reais."""
    minutes = dict(
        db.execute(
            select(StudySession.technology_id, func.sum(StudySession.duration_minutes))
            .where(StudySession.user_id == user_id)
            .group_by(StudySession.technology_id)
        ).all()
    )
    entries = dict(
        db.execute(
            select(journal_technologies.c.technology_id, func.count())
            .join(JournalEntry, JournalEntry.id == journal_technologies.c.entry_id)
            .where(JournalEntry.user_id == user_id)
            .group_by(journal_technologies.c.technology_id)
        ).all()
    )
    projects = dict(
        db.execute(
            select(project_technologies.c.technology_id, func.count())
            .join(Project, Project.id == project_technologies.c.project_id)
            .where(Project.user_id == user_id)
            .group_by(project_technologies.c.technology_id)
        ).all()
    )
    summary = [
        {
            "id": tech.id,
            "name": tech.name,
            "study_minutes": minutes.get(tech.id, 0),
            "journal_entries": entries.get(tech.id, 0),
            "projects": projects.get(tech.id, 0),
        }
        for tech in db.scalars(select(Technology).where(Technology.user_id == user_id))
    ]
    return sorted(summary, key=lambda item: (-item["study_minutes"], item["name"].casefold()))


@router.get("/technologies", response_model=list[TechnologyRead])
def list_technologies(db: Db, user: CurrentUser):
    return technology_summary(db, user.id)


@router.get("/tags", response_model=list[str])
def list_tags(db: Db, user: CurrentUser):
    return list(db.scalars(select(Tag.name).where(Tag.user_id == user.id).order_by(Tag.normalized_name)))


@router.get("/categories", response_model=list[str])
def list_categories(db: Db, user: CurrentUser):
    return list(
        db.scalars(select(Category.name).where(Category.user_id == user.id).order_by(Category.normalized_name))
    )
