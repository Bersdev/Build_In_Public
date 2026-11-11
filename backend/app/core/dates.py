from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.errors import ValidationFailed


def local_today(timezone: str) -> date:
    """O dia de hoje para o usuário, que pode ser diferente do dia em UTC."""
    return datetime.now(ZoneInfo(timezone)).date()


def reject_future(value: date, timezone: str) -> None:
    if value > local_today(timezone):
        raise ValidationFailed("A data não pode estar no futuro.")


def reject_inverted_dates(start: date | None, end: date | None) -> None:
    if start and end and end < start:
        raise ValidationFailed("A data final não pode ser anterior à data de início.")
