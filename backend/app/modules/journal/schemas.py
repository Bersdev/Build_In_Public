from datetime import date, datetime
from typing import Annotated, ClassVar

from pydantic import Field

from app.core.schemas import LongText, Minutes, NameList, PatchSchema, Schema, Title

Language = Annotated[str, Field(max_length=60)]


class JournalCreate(Schema):
    title: Title
    entry_date: date
    description: LongText | None = None
    duration_minutes: Minutes | None = None
    language: Language | None = None
    difficulties: LongText | None = None
    errors: LongText | None = None
    solutions: LongText | None = None
    key_learnings: LongText | None = None
    project_id: int | None = None
    technologies: NameList = []
    tags: NameList = []
    categories: NameList = []


class JournalUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset(
        {"title", "entry_date", "technologies", "tags", "categories"}
    )

    title: Title | None = None
    entry_date: date | None = None
    description: LongText | None = None
    duration_minutes: Minutes | None = None
    language: Language | None = None
    difficulties: LongText | None = None
    errors: LongText | None = None
    solutions: LongText | None = None
    key_learnings: LongText | None = None
    project_id: int | None = None
    technologies: NameList | None = None
    tags: NameList | None = None
    categories: NameList | None = None


class JournalRead(Schema):
    id: int
    title: str
    entry_date: date
    description: str | None
    duration_minutes: int | None
    language: str | None
    difficulties: str | None
    errors: str | None
    solutions: str | None
    key_learnings: str | None
    project_id: int | None
    project_name: str | None
    technologies: NameList
    tags: NameList
    categories: NameList
    created_at: datetime
    updated_at: datetime


class CalendarDay(Schema):
    date: date
    count: int
