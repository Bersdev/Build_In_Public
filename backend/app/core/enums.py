from enum import StrEnum

from sqlalchemy import Enum


def enum_column(enum_class) -> Enum:
    """Guarda o valor do Enum como texto, igual em SQLite e PostgreSQL."""
    return Enum(enum_class, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])


class Priority(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ProjectStatus(StrEnum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class TaskStatus(StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class CourseStatus(StrEnum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class GoalKind(StrEnum):
    WEEKLY_STUDY_HOURS = "weekly_study_hours"
    TOTAL_STUDY_HOURS = "total_study_hours"
    COMPLETED_PROJECTS = "completed_projects"
    COMPLETED_COURSES = "completed_courses"
    MANUAL = "manual"
