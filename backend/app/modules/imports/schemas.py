from datetime import date
from typing import Annotated

from pydantic import Field

from app.core.enums import GoalKind, Priority
from app.core.schemas import LongText, NameList, Schema, Title, WebUrl
from app.modules.goals.schemas import Target

TechnologyName = Annotated[str, Field(min_length=1, max_length=60)]


class PlanItem(Schema):
    title: Title
    url: WebUrl | None = None
    notes: LongText | None = None


class PlanStage(Schema):
    title: Title
    items: Annotated[list[PlanItem], Field(max_length=500)] = []


class PlanRoadmap(Schema):
    title: Title
    technology: TechnologyName | None = None
    description: LongText | None = None
    stages: Annotated[list[PlanStage], Field(min_length=1, max_length=50)]


class PlanGoal(Schema):
    title: Title
    description: LongText | None = None
    kind: GoalKind = GoalKind.MANUAL
    target_value: Target
    due_date: date | None = None


class PlanProject(Schema):
    name: Title
    description: LongText | None = None
    objective: LongText | None = None
    technologies: Annotated[NameList, Field(max_length=20)] = []
    due_date: date | None = None


class PlanTask(Schema):
    title: Title
    description: LongText | None = None
    priority: Priority = Priority.MEDIUM
    due_date: date | None = None
    # Nome de um projeto do próprio plano, para ligar a tarefa a ele.
    project: Title | None = None
    technology: TechnologyName | None = None


class ImportPlan(Schema):
    roadmap: PlanRoadmap | None = None
    goals: Annotated[list[PlanGoal], Field(max_length=100)] = []
    projects: Annotated[list[PlanProject], Field(max_length=50)] = []
    tasks: Annotated[list[PlanTask], Field(max_length=300)] = []


class AnalyzeRequest(Schema):
    # Cerca de 20 mil tokens: cabe no contexto do modelo e responde dentro do tempo da Vercel.
    content: Annotated[str, Field(min_length=1, max_length=60_000)]


class AnalyzeResponse(Schema):
    plan: ImportPlan
    warnings: list[str]


class ApplyRequest(Schema):
    plan: ImportPlan


class ApplyResult(Schema):
    learning_path_id: int | None
    goals: int
    projects: int
    tasks: int


class AiStatus(Schema):
    enabled: bool
