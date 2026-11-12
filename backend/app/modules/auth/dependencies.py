from typing import Annotated

from fastapi import Depends, Request

from app.core import rate_limit
from app.core.config import get_settings
from app.core.database import Db
from app.core.errors import UnauthorizedError
from app.modules.auth import service
from app.modules.auth.models import User


def get_current_user(request: Request, db: Db) -> User:
    user = service.user_from_token(db, request.cookies.get(get_settings().cookie_name))
    if user is None:
        raise UnauthorizedError()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


# Teto de escritas por pessoa: um usuário logado não pode encher o banco gratuito nem gastar a
# função à vontade. Uma pessoa real fica muito abaixo disso.
WRITE_LIMIT = 600
WRITE_WINDOW = 3600
_READ_ONLY = {"GET", "HEAD", "OPTIONS"}


def write_budget(request: Request, db: Db) -> None:
    # Login, cadastro e troca de senha já têm limites próprios.
    if request.method in _READ_ONLY or request.url.path.startswith("/api/v1/auth/"):
        return
    # Só conta quem tem sessão válida; um cookie inventado não grava nada no banco.
    user = service.user_from_token(db, request.cookies.get(get_settings().cookie_name))
    if user is not None:
        rate_limit.hit(db, f"write:user:{user.id}", WRITE_LIMIT, WRITE_WINDOW)
