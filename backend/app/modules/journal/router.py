from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.database import Db
from app.modules.auth.dependencies import CurrentUser
from app.modules.catalog.service import get_owned
from app.modules.journal import schemas, service
from app.modules.journal.models import JournalEntry

router = APIRouter(prefix="/journal", tags=["Diário"])


@router.get("", response_model=list[schemas.JournalRead])
def list_entries(
    db: Db,
    user: CurrentUser,
    q: Annotated[str | None, Query(max_length=200)] = None,
    date_from: date | None = None,
    date_to: date | None = None,
    technology: str | None = None,
    tag: str | None = None,
    category: str | None = None,
    project_id: int | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return service.list_entries(
        db, user.id, q, date_from, date_to, technology, tag, category, project_id, limit, offset
    )


@router.post("", response_model=schemas.JournalRead, status_code=status.HTTP_201_CREATED)
def create_entry(data: schemas.JournalCreate, db: Db, user: CurrentUser):
    return service.create(db, user, data)


@router.get("/calendar", response_model=list[schemas.CalendarDay])
def calendar(
    db: Db,
    user: CurrentUser,
    year: Annotated[int, Query(ge=1970, le=2200)],
    month: Annotated[int, Query(ge=1, le=12)],
):
    return service.calendar(db, user.id, year, month)


@router.get("/{entry_id}", response_model=schemas.JournalRead)
def read_entry(entry_id: int, db: Db, user: CurrentUser):
    return get_owned(db, JournalEntry, entry_id, user.id)


@router.patch("/{entry_id}", response_model=schemas.JournalRead)
def update_entry(entry_id: int, data: schemas.JournalUpdate, db: Db, user: CurrentUser):
    return service.update(db, user, entry_id, data)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: int, db: Db, user: CurrentUser):
    service.delete_entry(db, user, entry_id)
