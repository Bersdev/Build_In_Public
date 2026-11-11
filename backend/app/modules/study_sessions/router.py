from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.database import Db
from app.modules.auth.dependencies import CurrentUser
from app.modules.catalog.service import get_owned
from app.modules.study_sessions import schemas, service
from app.modules.study_sessions.models import StudySession

router = APIRouter(prefix="/study-sessions", tags=["Sessões de estudo"])


@router.get("", response_model=list[schemas.StudySessionRead])
def list_sessions(
    db: Db,
    user: CurrentUser,
    technology: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return service.list_sessions(db, user.id, technology, date_from, date_to, limit, offset)


@router.post("", response_model=schemas.StudySessionRead, status_code=status.HTTP_201_CREATED)
def create_session(data: schemas.StudySessionCreate, db: Db, user: CurrentUser):
    return service.create(db, user, data)


@router.get("/{session_id}", response_model=schemas.StudySessionRead)
def read_session(session_id: int, db: Db, user: CurrentUser):
    return get_owned(db, StudySession, session_id, user.id)


@router.patch("/{session_id}", response_model=schemas.StudySessionRead)
def update_session(session_id: int, data: schemas.StudySessionUpdate, db: Db, user: CurrentUser):
    return service.update(db, user, session_id, data)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, db: Db, user: CurrentUser):
    service.delete_session(db, user, session_id)
