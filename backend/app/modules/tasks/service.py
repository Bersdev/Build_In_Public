from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import utcnow
from app.core.dates import local_today
from app.core.enums import TaskStatus
from app.modules.activity.service import record_activity
from app.modules.auth.models import User
from app.modules.catalog.models import Technology
from app.modules.catalog.service import get_or_create, get_owned
from app.modules.gamification import rules
from app.modules.gamification.service import evaluate_achievements, revoke_xp, sync_xp
from app.modules.projects.models import Project
from app.modules.tasks import schemas
from app.modules.tasks.models import Task


def mark_overdue(tasks: list[Task], today: date) -> list[Task]:
    for task in tasks:
        task.is_overdue = bool(task.due_date and task.due_date < today and task.status != TaskStatus.DONE)
    return tasks


def _apply(db: Session, task: Task, changes: dict) -> None:
    if changes.get("project_id") is not None:
        get_owned(db, Project, changes["project_id"], task.user_id)
    if "technology" in changes:
        name = changes.pop("technology")
        task.technology = get_or_create(db, Technology, task.user_id, name) if name else None
    for field, value in changes.items():
        setattr(task, field, value)


def _sync_completion(db: Session, task: Task) -> None:
    db.flush()
    if task.status == TaskStatus.DONE and task.completed_at is None:
        task.completed_at = utcnow()
        sync_xp(db, task.user_id, rules.TASK_COMPLETED, task.id, rules.XP_RULES[rules.TASK_COMPLETED])
        record_activity(db, task.user_id, "task_completed", f"Tarefa concluída: {task.title}", "task", task.id)
    elif task.status != TaskStatus.DONE and task.completed_at is not None:
        task.completed_at = None
        revoke_xp(db, task.user_id, rules.TASK_COMPLETED, task.id)


def create(db: Session, user: User, data: schemas.TaskCreate) -> Task:
    task = Task(user_id=user.id, title=data.title)
    db.add(task)
    _apply(db, task, data.model_dump())
    _sync_completion(db, task)
    evaluate_achievements(db, user.id)
    db.commit()
    return mark_overdue([task], local_today(user.timezone))[0]


def update(db: Session, user: User, task_id: int, data: schemas.TaskUpdate) -> Task:
    task = get_owned(db, Task, task_id, user.id)
    _apply(db, task, data.changes())
    _sync_completion(db, task)
    evaluate_achievements(db, user.id)
    db.commit()
    db.refresh(task)
    return mark_overdue([task], local_today(user.timezone))[0]


def read(db: Session, user: User, task_id: int) -> Task:
    return mark_overdue([get_owned(db, Task, task_id, user.id)], local_today(user.timezone))[0]


def delete_task(db: Session, user: User, task_id: int) -> None:
    task = get_owned(db, Task, task_id, user.id)
    revoke_xp(db, user.id, rules.TASK_COMPLETED, task.id)
    db.delete(task)
    db.commit()


def list_tasks(
    db: Session,
    user: User,
    view: schemas.TaskView = "all",
    status: TaskStatus | None = None,
    project_id: int | None = None,
) -> list[Task]:
    today = local_today(user.timezone)
    query = (
        select(Task)
        .where(Task.user_id == user.id)
        .options(selectinload(Task.project), selectinload(Task.technology))
    )
    open_task = Task.status != TaskStatus.DONE
    if view == "today":
        query = query.where(Task.due_date == today, open_task)
    elif view == "upcoming":
        query = query.where(Task.due_date > today, open_task)
    elif view == "overdue":
        query = query.where(Task.due_date < today, open_task)
    elif view == "completed":
        query = query.where(Task.status == TaskStatus.DONE)
    if status:
        query = query.where(Task.status == status)
    if project_id:
        query = query.where(Task.project_id == project_id)
    # Tarefas sem prazo aparecem depois das que têm prazo.
    query = query.order_by(Task.due_date.is_(None), Task.due_date, Task.id)
    return mark_overdue(list(db.scalars(query)), today)
