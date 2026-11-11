from fastapi import APIRouter, status

from app.core.database import Db
from app.core.enums import TaskStatus
from app.modules.auth.dependencies import CurrentUser
from app.modules.tasks import schemas, service

router = APIRouter(prefix="/tasks", tags=["Tarefas"])


@router.get("", response_model=list[schemas.TaskRead])
def list_tasks(
    db: Db,
    user: CurrentUser,
    view: schemas.TaskView = "all",
    status: TaskStatus | None = None,
    project_id: int | None = None,
):
    return service.list_tasks(db, user, view, status, project_id)


@router.post("", response_model=schemas.TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(data: schemas.TaskCreate, db: Db, user: CurrentUser):
    return service.create(db, user, data)


@router.get("/{task_id}", response_model=schemas.TaskRead)
def read_task(task_id: int, db: Db, user: CurrentUser):
    return service.read(db, user, task_id)


@router.patch("/{task_id}", response_model=schemas.TaskRead)
def update_task(task_id: int, data: schemas.TaskUpdate, db: Db, user: CurrentUser):
    return service.update(db, user, task_id, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Db, user: CurrentUser):
    service.delete_task(db, user, task_id)
