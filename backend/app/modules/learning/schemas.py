from datetime import date, datetime
from typing import Annotated, ClassVar

from pydantic import Field

from app.core.enums import CourseStatus
from app.core.schemas import LongText, PatchSchema, Schema, ShortText, Title, WebUrl

TechnologyName = Annotated[str, Field(min_length=1, max_length=60)]


class CourseCreate(Schema):
    title: Title
    provider: ShortText | None = None
    url: WebUrl | None = None
    status: CourseStatus = CourseStatus.PLANNED
    start_date: date | None = None
    target_date: date | None = None


class CourseUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"title", "status"})

    title: Title | None = None
    provider: ShortText | None = None
    url: WebUrl | None = None
    status: CourseStatus | None = None
    start_date: date | None = None
    target_date: date | None = None


class CourseRead(Schema):
    id: int
    title: str
    provider: str | None
    url: str | None
    status: CourseStatus
    start_date: date | None
    target_date: date | None
    completed_at: datetime | None


class PathCreate(Schema):
    title: Title
    description: LongText | None = None
    technology: TechnologyName | None = None
    start_date: date | None = None
    target_date: date | None = None


class PathImport(Schema):
    title: Title
    technology: TechnologyName | None = None
    # Cerca de 300 KB: sobra para 500 conteúdos com notas.
    content: Annotated[str, Field(max_length=300_000)]


class PathUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"title"})

    title: Title | None = None
    description: LongText | None = None
    technology: TechnologyName | None = None
    start_date: date | None = None
    target_date: date | None = None


class StageCreate(Schema):
    title: Title


class StageUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"title"})

    title: Title | None = None


class ItemCreate(Schema):
    title: Title
    url: WebUrl | None = None
    notes: LongText | None = None
    course_id: int | None = None


class ItemUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"title", "completed"})

    title: Title | None = None
    url: WebUrl | None = None
    notes: LongText | None = None
    course_id: int | None = None
    completed: bool | None = None


class ItemRead(Schema):
    id: int
    title: str
    url: str | None
    notes: str | None
    course_id: int | None
    course_title: str | None
    completed_at: datetime | None


class StageRead(Schema):
    id: int
    title: str
    items: list[ItemRead]


class PathRead(Schema):
    id: int
    title: str
    description: str | None
    technology: str | None = Field(validation_alias="technology_name")
    start_date: date | None
    target_date: date | None
    total_items: int
    completed_items: int
    progress_percent: int


class PathDetail(PathRead):
    stages: list[StageRead]
