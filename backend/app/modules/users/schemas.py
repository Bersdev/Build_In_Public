from datetime import datetime
from typing import Annotated, ClassVar, Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import AfterValidator, Field, StringConstraints

from app.core.schemas import LongText, NameList, PatchSchema, Schema, WebUrl

Experience = Literal["beginner", "intermediate", "advanced"]


def _validate_timezone(value: str) -> str:
    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError) as error:
        raise ValueError("Fuso horário inválido.") from error
    return value


Timezone = Annotated[str, AfterValidator(_validate_timezone)]


class UserRead(Schema):
    id: int
    name: str
    email: str
    bio: str | None
    avatar_url: str | None
    career_goal: str | None
    experience_level: Experience | None
    timezone: str
    created_at: datetime
    interests: NameList


class UserUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"name", "timezone", "interests"})

    name: Annotated[str, Field(min_length=1, max_length=120)] | None = None
    bio: LongText | None = None
    avatar_url: WebUrl | None = None
    career_goal: Annotated[str, Field(max_length=200)] | None = None
    experience_level: Experience | None = None
    timezone: Timezone | None = None
    interests: NameList | None = None


class SettingsRead(Schema):
    theme: Literal["dark", "light", "system"]
    default_task_view: Literal["list", "kanban"]
    email_notifications: bool


class SettingsUpdate(PatchSchema):
    non_nullable: ClassVar[frozenset[str]] = frozenset({"theme", "default_task_view", "email_notifications"})

    theme: Literal["dark", "light", "system"] | None = None
    default_task_view: Literal["list", "kanban"] | None = None
    email_notifications: bool | None = None


class DeleteAccountRequest(Schema):
    password: Annotated[str, StringConstraints(strip_whitespace=False, max_length=128)]
