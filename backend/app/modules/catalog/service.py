from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError


def get_owned(db: Session, model, record_id: int, user_id: int):
    """Busca um registro do usuário. O de outra pessoa responde como inexistente."""
    record = db.scalar(select(model).where(model.id == record_id, model.user_id == user_id))
    if record is None:
        raise NotFoundError()
    return record


def get_or_create(db: Session, model, user_id: int, name: str):
    clean = " ".join(name.split())
    normalized = clean.casefold()
    record = db.scalar(select(model).where(model.user_id == user_id, model.normalized_name == normalized))
    if record is None:
        record = model(user_id=user_id, name=clean, normalized_name=normalized)
        db.add(record)
        db.flush()
    return record


def get_or_create_many(db: Session, model, user_id: int, names: list[str]) -> list:
    records = []
    for name in names:
        record = get_or_create(db, model, user_id, name)
        if record not in records:
            records.append(record)
    return records
