from typing import Annotated

from fastapi import Depends, Request

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
