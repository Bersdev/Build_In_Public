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
    # 200 cobre planos semanais de vários anos.
    stages: Annotated[list[PlanStage], Field(min_length=1, max_length=200)]


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


ColumnIndex = Annotated[int, Field(ge=0, le=200)]


class Columns(Schema):
    """Qual coluna do CSV guarda cada informação dos conteúdos da trilha."""

    title: ColumnIndex | None = None
    stage: ColumnIndex | None = None
    url: ColumnIndex | None = None
    notes: ColumnIndex | None = None


class AnalyzeRequest(Schema):
    # O arquivo inteiro vai em cada chamada; a análise processa uma parte a partir de start_row.
    content: Annotated[str, Field(min_length=1, max_length=150_000)]
    start_row: Annotated[int, Field(ge=0)] = 0
    # Definidas na primeira parte e repetidas nas seguintes, para todas lerem igual.
    columns: Columns | None = None
    # Etapa da última linha da parte anterior, para linhas sem etapa continuarem nela.
    stage: Title | None = None


class AnalyzeResponse(Schema):
    plan: ImportPlan
    warnings: list[str]
    columns: Columns
    stage: str | None
    next_row: int | None
    total_rows: int


class ApplyRequest(Schema):
    plan: ImportPlan


class ApplyResult(Schema):
    learning_path_id: int | None
    goals: int
    projects: int
    tasks: int


class AiStatus(Schema):
    enabled: bool
