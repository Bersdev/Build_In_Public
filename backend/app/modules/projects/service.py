from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import utcnow
from app.core.dates import local_today, reject_inverted_dates
from app.core.enums import ProjectStatus, TaskStatus
from app.modules.activity.service import record_activity
from app.modules.auth.models import User
from app.modules.catalog.models import Technology
from app.modules.catalog.service import get_or_create_many, get_owned
from app.modules.gamification import rules
from app.modules.gamification.service import evaluate_achievements, revoke_xp, sync_xp
from app.modules.projects import schemas
from app.modules.projects.models import Project, ProjectUpdate
from app.modules.tasks.service import mark_overdue

STATUS_LABELS = {
    ProjectStatus.PLANNING: "Planejamento",
    ProjectStatus.IN_PROGRESS: "Em andamento",
    ProjectStatus.PAUSED: "Pausado",
    ProjectStatus.COMPLETED: "Concluído",
    ProjectStatus.ARCHIVED: "Arquivado",
}


def _apply(db: Session, project: Project, changes: dict) -> None:
    if "technologies" in changes:
        project.technologies = get_or_create_many(db, Technology, project.user_id, changes.pop("technologies"))
    for field, value in changes.items():
        setattr(project, field, value)
    reject_inverted_dates(project.start_date, project.due_date)


def _sync_completion(db: Session, project: Project) -> None:
    if project.status == ProjectStatus.COMPLETED and project.completed_at is None:
        project.completed_at = utcnow()
        project.progress_percent = 100
        sync_xp(db, project.user_id, rules.PROJECT_COMPLETED, project.id, rules.XP_RULES[rules.PROJECT_COMPLETED])
        record_activity(
            db, project.user_id, "project_completed", f"Projeto concluído: {project.name}", "project", project.id
        )
    elif project.status != ProjectStatus.COMPLETED and project.completed_at is not None:
        project.completed_at = None
        revoke_xp(db, project.user_id, rules.PROJECT_COMPLETED, project.id)


def create(db: Session, user: User, data: schemas.ProjectCreate) -> Project:
    project = Project(user_id=user.id, name=data.name)
    db.add(project)
    _apply(db, project, data.model_dump())
    db.flush()
    _sync_completion(db, project)
    record_activity(db, user.id, "project_created", f"Novo projeto: {project.name}", "project", project.id)
    evaluate_achievements(db, user.id)
    db.commit()
    return project


def update(db: Session, user: User, project_id: int, data: schemas.ProjectUpdateRequest) -> Project:
    project = get_owned(db, Project, project_id, user.id)
    previous_status = project.status
    _apply(db, project, data.changes())
    if project.status != previous_status:
        db.add(
            ProjectUpdate(
                user_id=user.id,
                project_id=project.id,
                kind="status",
                content=f"Status: {STATUS_LABELS[previous_status]} → {STATUS_LABELS[project.status]}",
            )
        )
    _sync_completion(db, project)
    evaluate_achievements(db, user.id)
    db.commit()
    db.refresh(project)
    return project


def add_note(db: Session, user: User, project_id: int, content: str) -> ProjectUpdate:
    project = get_owned(db, Project, project_id, user.id)
    note = ProjectUpdate(user_id=user.id, project_id=project.id, kind="note", content=content)
    db.add(note)
    record_activity(db, user.id, "project_update", f"{project.name}: {content[:150]}", "project", project.id)
    db.commit()
    return note


def delete_project(db: Session, user: User, project_id: int) -> None:
    project = get_owned(db, Project, project_id, user.id)
    revoke_xp(db, user.id, rules.PROJECT_COMPLETED, project.id)
    db.delete(project)
    db.commit()


def list_projects(db: Session, user_id: int, status: ProjectStatus | None = None) -> list[Project]:
    query = select(Project).where(Project.user_id == user_id).options(selectinload(Project.technologies))
    if status:
        query = query.where(Project.status == status)
    return list(db.scalars(query.order_by(Project.updated_at.desc(), Project.id.desc())))


def detail(db: Session, user: User, project_id: int) -> dict:
    project = get_owned(db, Project, project_id, user.id)
    tasks = mark_overdue(project.tasks, local_today(user.timezone))
    result = schemas.ProjectRead.model_validate(project).model_dump()
    return {
        **result,
        "tasks": tasks,
        "updates": project.updates,
        "journal_entries": project.journal_entries,
        "tasks_total": len(tasks),
        "tasks_done": sum(1 for task in tasks if task.status == TaskStatus.DONE),
    }
