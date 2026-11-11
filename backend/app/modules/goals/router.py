from fastapi import APIRouter, status

from app.core.database import Db
from app.modules.auth.dependencies import CurrentUser
from app.modules.catalog.service import get_owned
from app.modules.goals import schemas, service
from app.modules.goals.models import Goal

router = APIRouter(prefix="/goals", tags=["Metas"])


@router.get("", response_model=list[schemas.GoalRead])
def list_goals(db: Db, user: CurrentUser, active: bool | None = None):
    return service.list_goals(db, user, active)


@router.post("", response_model=schemas.GoalRead, status_code=status.HTTP_201_CREATED)
def create_goal(data: schemas.GoalCreate, db: Db, user: CurrentUser):
    return service.create(db, user, data)


@router.get("/{goal_id}", response_model=schemas.GoalRead)
def read_goal(goal_id: int, db: Db, user: CurrentUser):
    return service.to_read(db, user, get_owned(db, Goal, goal_id, user.id))


@router.patch("/{goal_id}", response_model=schemas.GoalRead)
def update_goal(goal_id: int, data: schemas.GoalUpdate, db: Db, user: CurrentUser):
    return service.update(db, user, goal_id, data)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Db, user: CurrentUser):
    service.delete_goal(db, user, goal_id)
