from fastapi import APIRouter, status

from app.core.database import Db
from app.core.enums import ProjectStatus
from app.modules.auth.dependencies import CurrentUser
from app.modules.projects import schemas, service

router = APIRouter(prefix="/projects", tags=["Projetos"])


@router.get("", response_model=list[schemas.ProjectRead])
def list_projects(db: Db, user: CurrentUser, status: ProjectStatus | None = None):
    return service.list_projects(db, user.id, status)


@router.post("", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(data: schemas.ProjectCreate, db: Db, user: CurrentUser):
    return service.create(db, user, data)


@router.get("/{project_id}", response_model=schemas.ProjectDetail)
def read_project(project_id: int, db: Db, user: CurrentUser):
    return service.detail(db, user, project_id)


@router.patch("/{project_id}", response_model=schemas.ProjectRead)
def update_project(project_id: int, data: schemas.ProjectUpdateRequest, db: Db, user: CurrentUser):
    return service.update(db, user, project_id, data)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Db, user: CurrentUser):
    service.delete_project(db, user, project_id)


@router.post(
    "/{project_id}/updates", response_model=schemas.ProjectUpdateRead, status_code=status.HTTP_201_CREATED
)
def add_update(project_id: int, data: schemas.ProjectNote, db: Db, user: CurrentUser):
    return service.add_note(db, user, project_id, data.content)
