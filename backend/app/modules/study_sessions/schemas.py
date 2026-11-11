from datetime import date, datetime
from typing import Annotated, ClassVar

from pydantic import Field

from app.core.schemas import LongText, Minutes, PatchSchema, Schema

TechnologyName = Annotated[str, Field(min_length=1, max_length=60)]


class StudySessionCreate(Schema):
    study_date: date
    duration_minutes: Minutes
    technology: TechnologyName | None = None
    notes: LongText | None = None


class StudySessionUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"study_date", "duration_minutes"})

    study_date: date | None = None
    duration_minutes: Minutes | None = None
    technology: TechnologyName | None = None
    notes: LongText | None = None


class StudySessionRead(Schema):
    id: int
    study_date: date
    duration_minutes: int
    technology: str | None = Field(validation_alias="technology_name")
    notes: str | None
    journal_entry_id: int | None
    created_at: datetime
