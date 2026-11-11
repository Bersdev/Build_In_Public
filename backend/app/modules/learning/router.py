from fastapi import APIRouter, status

from app.core.database import Db
from app.modules.auth.dependencies import CurrentUser
from app.modules.catalog.service import get_owned
from app.modules.learning import schemas, service
from app.modules.learning.models import LearningPath

router = APIRouter(tags=["Estudos e roadmaps"])
CREATED = status.HTTP_201_CREATED
NO_CONTENT = status.HTTP_204_NO_CONTENT


@router.get("/courses", response_model=list[schemas.CourseRead])
def list_courses(db: Db, user: CurrentUser):
    return service.list_courses(db, user.id)


@router.post("/courses", response_model=schemas.CourseRead, status_code=CREATED)
def create_course(data: schemas.CourseCreate, db: Db, user: CurrentUser):
    return service.create_course(db, user, data)


@router.patch("/courses/{course_id}", response_model=schemas.CourseRead)
def update_course(course_id: int, data: schemas.CourseUpdate, db: Db, user: CurrentUser):
    return service.update_course(db, user, course_id, data)


@router.delete("/courses/{course_id}", status_code=NO_CONTENT)
def delete_course(course_id: int, db: Db, user: CurrentUser):
    service.delete_course(db, user, course_id)


@router.get("/learning-paths", response_model=list[schemas.PathRead])
def list_paths(db: Db, user: CurrentUser):
    return service.list_paths(db, user.id)


@router.post("/learning-paths", response_model=schemas.PathRead, status_code=CREATED)
def create_path(data: schemas.PathCreate, db: Db, user: CurrentUser):
    return service.create_path(db, user, data)


@router.get("/learning-paths/{path_id}", response_model=schemas.PathDetail)
def read_path(path_id: int, db: Db, user: CurrentUser):
    return get_owned(db, LearningPath, path_id, user.id)


@router.patch("/learning-paths/{path_id}", response_model=schemas.PathRead)
def update_path(path_id: int, data: schemas.PathUpdate, db: Db, user: CurrentUser):
    return service.update_path(db, user, path_id, data)


@router.delete("/learning-paths/{path_id}", status_code=NO_CONTENT)
def delete_path(path_id: int, db: Db, user: CurrentUser):
    service.delete_path(db, user, path_id)


@router.post("/learning-paths/{path_id}/stages", response_model=schemas.StageRead, status_code=CREATED)
def create_stage(path_id: int, data: schemas.StageCreate, db: Db, user: CurrentUser):
    return service.create_stage(db, user, path_id, data.title)


@router.patch("/learning-stages/{stage_id}", response_model=schemas.StageRead)
def update_stage(stage_id: int, data: schemas.StageUpdate, db: Db, user: CurrentUser):
    return service.update_stage(db, user, stage_id, data)


@router.delete("/learning-stages/{stage_id}", status_code=NO_CONTENT)
def delete_stage(stage_id: int, db: Db, user: CurrentUser):
    service.delete_stage(db, user, stage_id)


@router.post("/learning-stages/{stage_id}/items", response_model=schemas.ItemRead, status_code=CREATED)
def create_item(stage_id: int, data: schemas.ItemCreate, db: Db, user: CurrentUser):
    return service.create_item(db, user, stage_id, data)


@router.patch("/learning-items/{item_id}", response_model=schemas.ItemRead)
def update_item(item_id: int, data: schemas.ItemUpdate, db: Db, user: CurrentUser):
    return service.update_item(db, user, item_id, data)


@router.delete("/learning-items/{item_id}", status_code=NO_CONTENT)
def delete_item(item_id: int, db: Db, user: CurrentUser):
    service.delete_item(db, user, item_id)
