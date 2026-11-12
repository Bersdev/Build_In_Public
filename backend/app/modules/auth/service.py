import hashlib
import logging
import secrets
from datetime import timedelta

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core import rate_limit
from app.core.config import get_settings
from app.core.database import utcnow
from app.core.errors import ConflictError, UnauthorizedError, ValidationFailed
from app.modules.auth.models import PasswordResetToken, User, UserSession, UserSettings

logger = logging.getLogger("uvicorn.error")
_hasher = PasswordHasher()
# Usado quando o e-mail não existe, para o login levar o mesmo tempo nos dois casos.
_DUMMY_HASH = _hasher.hash("senha-que-nunca-sera-usada")


# Limites de tentativas (ver app/core/rate_limit.py).
LOGIN_WINDOW = 900  # 15 minutos
LOGIN_FAILURES_PER_EMAIL = 5
LOGIN_FAILURES_PER_IP = 30
HOUR = 3600
REGISTER_PER_IP = 20
FORGOT_PASSWORD_PER_IP = 10


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(stored_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(stored_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def _hash_token(token: str) -> str:
    # Tokens ficam só como hash: um vazamento do banco não dá acesso às contas.
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User) -> str:
    db.execute(delete(UserSession).where(UserSession.user_id == user.id, UserSession.expires_at < utcnow()))
    token = secrets.token_urlsafe(32)
    expires_at = utcnow() + timedelta(days=get_settings().session_days)
    db.add(UserSession(user_id=user.id, token_hash=_hash_token(token), expires_at=expires_at))
    db.commit()
    return token


def register(db: Session, name: str, email: str, password: str, timezone: str | None = None) -> User:
    email = email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise ConflictError("Este e-mail já está cadastrado.")
    user = User(name=name, email=email, password_hash=hash_password(password), settings=UserSettings())
    if timezone:
        user.timezone = timezone
    db.add(user)
    db.flush()
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower()))
    valid = verify_password(user.password_hash if user else _DUMMY_HASH, password)
    if user is None or not valid:
        raise UnauthorizedError("E-mail ou senha incorretos.")
    return user


def login(db: Session, email: str, password: str, ip: str) -> User:
    """Entra na conta, recusando quem erra a senha muitas vezes (por e-mail e por IP)."""
    email_key = f"login:email:{email.lower()}"
    ip_key = f"login:ip:{ip}"
    rate_limit.ensure_allowed(db, email_key, LOGIN_FAILURES_PER_EMAIL, LOGIN_WINDOW)
    rate_limit.ensure_allowed(db, ip_key, LOGIN_FAILURES_PER_IP, LOGIN_WINDOW)
    try:
        user = authenticate(db, email, password)
    except UnauthorizedError:
        rate_limit.record(db, email_key)
        rate_limit.record(db, ip_key)
        raise
    rate_limit.reset(db, email_key)
    return user


def throttle(db: Session, name: str, ip: str, limit: int, window_seconds: int) -> None:
    """Conta uma tentativa de `name` (cadastro, recuperação) vinda deste IP."""
    key = f"{name}:ip:{ip}"
    rate_limit.ensure_allowed(db, key, limit, window_seconds)
    rate_limit.record(db, key)


def user_from_token(db: Session, token: str | None) -> User | None:
    if not token:
        return None
    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == _hash_token(token), UserSession.expires_at > utcnow()
        )
    )
    return db.get(User, session.user_id) if session else None


def logout(db: Session, token: str | None) -> None:
    if token:
        db.execute(delete(UserSession).where(UserSession.token_hash == _hash_token(token)))
        db.commit()


def deliver_reset_link(email: str, link: str) -> None:
    # O envio real de e-mail é uma integração futura. Em desenvolvimento, o link vai para o log.
    if get_settings().environment == "development":
        logger.info("Recuperação de senha para %s: %s", email, link)
    else:
        logger.warning("Envio de e-mail não configurado; recuperação de senha não entregue.")


def request_password_reset(db: Session, email: str) -> None:
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None:
        return
    settings = get_settings()
    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(token),
            expires_at=utcnow() + timedelta(minutes=settings.password_reset_minutes),
        )
    )
    db.commit()
    deliver_reset_link(user.email, f"{settings.frontend_url}/redefinir-senha?token={token}")


def reset_password(db: Session, token: str, new_password: str) -> None:
    record = db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > utcnow(),
        )
    )
    if record is None:
        raise ValidationFailed("Este link é inválido ou expirou. Peça um novo.")
    user = db.get(User, record.user_id)
    user.password_hash = hash_password(new_password)
    record.used_at = utcnow()
    db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    db.commit()


def change_password(db: Session, user: User, current: str, new: str, current_token: str | None) -> None:
    if not verify_password(user.password_hash, current):
        raise ValidationFailed("A senha atual está incorreta.")
    user.password_hash = hash_password(new)
    # Encerra as sessões dos outros aparelhos: se alguém roubou uma sessão, ela deixa de valer.
    keep = _hash_token(current_token) if current_token else ""
    db.execute(delete(UserSession).where(UserSession.user_id == user.id, UserSession.token_hash != keep))
    db.commit()
