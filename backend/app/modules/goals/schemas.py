from datetime import date, datetime
from typing import Annotated, ClassVar

from pydantic import Field

from app.core.enums import GoalKind
from app.core.schemas import LongText, PatchSchema, Schema, Title

Target = Annotated[float, Field(gt=0, le=1_000_000)]
Value = Annotated[float, Field(ge=0, le=1_000_000)]


class GoalCreate(Schema):
    title: Title
    description: LongText | None = None
    kind: GoalKind = GoalKind.MANUAL
    target_value: Target
    manual_value: Value = 0
    start_date: date | None = None
    due_date: date | None = None


class GoalUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset(
        {"title", "kind", "target_value", "manual_value", "completed"}
    )

    title: Title | None = None
    description: LongText | None = None
    kind: GoalKind | None = None
    target_value: Target | None = None
    manual_value: Value | None = None
    start_date: date | None = None
    due_date: date | None = None
    completed: bool | None = None


class GoalRead(Schema):
    id: int
    title: str
    description: str | None
    kind: GoalKind
    target_value: float
    manual_value: float
    start_date: date | None
    due_date: date | None
    completed_at: datetime | None
    created_at: datetime
    current_value: float
    progress_percent: int
    is_reached: bool
