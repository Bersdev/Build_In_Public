from datetime import datetime

from fastapi import APIRouter

from app.core.database import Db
from app.core.schemas import Schema
from app.modules.auth.dependencies import CurrentUser
from app.modules.gamification import service

router = APIRouter(prefix="/gamification", tags=["Gamificação"])


class AchievementRead(Schema):
    code: str
    title: str
    description: str
    threshold: int
    current: int
    unlocked_at: datetime | None


class RuleRead(Schema):
    action: str
    xp: str


class GamificationRead(Schema):
    xp: int
    level: int
    level_start_xp: int
    next_level_xp: int
    current_streak: int
    longest_streak: int
    achievements: list[AchievementRead]
    rules: list[RuleRead]


@router.get("", response_model=GamificationRead)
def read_status(db: Db, user: CurrentUser):
    return service.status(db, user)
