from sqlalchemy.orm import Session

from app.modules.activity.models import ActivityEvent


def record_activity(
    db: Session,
    user_id: int,
    kind: str,
    title: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> None:
    db.add(ActivityEvent(user_id=user_id, kind=kind, title=title, entity_type=entity_type, entity_id=entity_id))
