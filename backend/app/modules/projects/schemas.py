from datetime import date, datetime
from typing import Annotated, ClassVar

from pydantic import Field

from app.core.enums import Priority, ProjectStatus
from app.core.schemas import LongText, NameList, PatchSchema, Schema, Title, WebUrl
from app.modules.tasks.schemas import TaskRead

Percent = Annotated[int, Field(ge=0, le=100)]


class ProjectCreate(Schema):
    name: Title
    description: LongText | None = None
    objective: LongText | None = None
    image_url: WebUrl | None = None
    status: ProjectStatus = ProjectStatus.PLANNING
    priority: Priority = Priority.MEDIUM
    start_date: date | None = None
    due_date: date | None = None
    progress_percent: Percent = 0
    github_url: WebUrl | None = None
    demo_url: WebUrl | None = None
    learnings: LongText | None = None
    technologies: NameList = []


class ProjectUpdateRequest(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset(
        {"name", "status", "priority", "progress_percent", "technologies"}
    )

    name: Title | None = None
    description: LongText | None = None
    objective: LongText | None = None
    image_url: WebUrl | None = None
    status: ProjectStatus | None = None
    priority: Priority | None = None
    start_date: date | None = None
    due_date: date | None = None
    progress_percent: Percent | None = None
    github_url: WebUrl | None = None
    demo_url: WebUrl | None = None
    learnings: LongText | None = None
    technologies: NameList | None = None


class ProjectNote(Schema):
    content: Annotated[str, Field(min_length=1, max_length=5000)]


class ProjectUpdateRead(Schema):
    id: int
    kind: str
    content: str
    created_at: datetime


class ProjectRead(Schema):
    id: int
    name: str
    description: str | None
    objective: str | None
    image_url: str | None
    status: ProjectStatus
    priority: Priority
    start_date: date | None
    due_date: date | None
    progress_percent: int
    github_url: str | None
    demo_url: str | None
    learnings: str | None
    technologies: NameList
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class JournalSummary(Schema):
    id: int
    title: str
    entry_date: date
    key_learnings: str | None


class ProjectDetail(ProjectRead):
    tasks: list[TaskRead]
    updates: list[ProjectUpdateRead]
    journal_entries: list[JournalSummary]
    tasks_total: int
    tasks_done: int
