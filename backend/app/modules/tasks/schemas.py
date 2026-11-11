from datetime import date, datetime
from typing import Annotated, ClassVar, Literal

from pydantic import Field

from app.core.enums import Priority, TaskStatus
from app.core.schemas import LongText, PatchSchema, Schema, Title

Category = Annotated[str, Field(max_length=60)]
TechnologyName = Annotated[str, Field(min_length=1, max_length=60)]
TaskView = Literal["all", "today", "upcoming", "overdue", "completed"]


class TaskCreate(Schema):
    title: Title
    description: LongText | None = None
    category: Category | None = None
    priority: Priority = Priority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: date | None = None
    project_id: int | None = None
    technology: TechnologyName | None = None


class TaskUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"title", "priority", "status"})

    title: Title | None = None
    description: LongText | None = None
    category: Category | None = None
    priority: Priority | None = None
    status: TaskStatus | None = None
    due_date: date | None = None
    project_id: int | None = None
    technology: TechnologyName | None = None


class TaskRead(Schema):
    id: int
    title: str
    description: str | None
    category: str | None
    priority: Priority
    status: TaskStatus
    due_date: date | None
    project_id: int | None
    project_name: str | None
    technology: str | None = Field(validation_alias="technology_name")
    is_overdue: bool
    created_at: datetime
    completed_at: datetime | None
