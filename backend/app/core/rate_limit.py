"""Limite de tentativas guardado no banco.

A API roda em funções serverless: cada chamada pode cair numa instância diferente, então um
contador em memória não segura ninguém. Cada tentativa vira uma linha; o limite é a contagem
de linhas dentro da janela de tempo. A chave é guardada só como hash, para não manter e-mails
e IPs em texto puro.
"""

import hashlib
import math
from datetime import datetime, timedelta

from fastapi import Request
from sqlalchemy import String, delete, func, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.database import Base, UTCDateTime, utcnow
from app.core.errors import AppError

# Eventos mais velhos que isso nunca mais contam para nenhum limite e são apagados.
KEEP_SECONDS = 86_400


class TooManyRequests(AppError):
    status_code = 429
    default_detail = "Muitas tentativas. Aguarde um pouco e tente de novo."


class RateLimitEvent(Base):
    __tablename__ = "rate_limit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, index=True)


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def client_ip(request: Request) -> str:
    # Na Vercel, x-forwarded-for traz o IP real de quem chamou (ela descarta o valor enviado pelo cliente).
    forwarded = request.headers.get("x-forwarded-for", "")
    first = forwarded.split(",")[0].strip()
    return first or (request.client.host if request.client else "desconhecido")


def _prune(db: Session) -> None:
    db.execute(delete(RateLimitEvent).where(RateLimitEvent.created_at < utcnow() - timedelta(seconds=KEEP_SECONDS)))


def _too_many(db: Session, hashed: str, limit: int, window_seconds: int) -> TooManyRequests:
    since = utcnow() - timedelta(seconds=window_seconds)
    recent = (
        select(RateLimitEvent.created_at)
        .where(RateLimitEvent.key == hashed, RateLimitEvent.created_at > since)
        .order_by(RateLimitEvent.created_at.desc())
        .limit(limit)
    )
    times = list(db.scalars(recent))
    # O evento que precisa sair da janela para voltar a caber é o `limit`-ésimo mais recente.
    wait = (times[-1] + timedelta(seconds=window_seconds) - utcnow()).total_seconds() if times else 1
    retry_after = max(1, math.ceil(wait))
    minutes = math.ceil(retry_after / 60)
    detail = "Muitas tentativas. Tente de novo em " + (
        f"{minutes} minuto{'s' if minutes != 1 else ''}." if retry_after > 60 else f"{retry_after} segundos."
    )
    return TooManyRequests(detail, extra={"retry_after": retry_after})


def _count(db: Session, hashed: str, window_seconds: int) -> int:
    since = utcnow() - timedelta(seconds=window_seconds)
    return db.scalar(
        select(func.count()).select_from(RateLimitEvent).where(
            RateLimitEvent.key == hashed, RateLimitEvent.created_at > since
        )
    )


def hit(db: Session, key: str, limit: int, window_seconds: int) -> int:
    """Registra a tentativa e só depois conta; passou do limite, levanta TooManyRequests.

    Gravar antes de contar fecha a corrida em que várias requisições paralelas veem a contagem
    antiga e passam todas. A tentativa barrada é desfeita, para insistir não prolongar o bloqueio.
    Devolve o id do evento, que `release` desfaz (por exemplo, quando o login dá certo).
    """
    hashed = hash_key(key)
    _prune(db)
    event = RateLimitEvent(key=hashed)
    db.add(event)
    db.commit()
    event_id = event.id
    if _count(db, hashed, window_seconds) > limit:
        db.execute(delete(RateLimitEvent).where(RateLimitEvent.id == event_id))
        db.commit()
        raise _too_many(db, hashed, limit, window_seconds)
    return event_id


def release(db: Session, event_id: int) -> None:
    db.execute(delete(RateLimitEvent).where(RateLimitEvent.id == event_id))
    db.commit()


def ensure_allowed(db: Session, key: str, limit: int, window_seconds: int) -> None:
    """Levanta TooManyRequests se a chave já teve `limit` eventos dentro da janela."""
    hashed = hash_key(key)
    if _count(db, hashed, window_seconds) >= limit:
        raise _too_many(db, hashed, limit, window_seconds)


def record(db: Session, key: str) -> None:
    _prune(db)
    db.add(RateLimitEvent(key=hash_key(key)))
    db.commit()


def reset(db: Session, key: str) -> None:
    db.execute(delete(RateLimitEvent).where(RateLimitEvent.key == hash_key(key)))
    db.commit()
