from fastapi import APIRouter, Response, status

from app.core.database import Db
from app.core.errors import ValidationFailed
from app.modules.auth import service as auth_service
from app.modules.auth.dependencies import CurrentUser
from app.modules.auth.router import clear_session_cookie
from app.modules.catalog.models import Technology
from app.modules.catalog.service import get_or_create_many
from app.modules.users import schemas

router = APIRouter(prefix="/users/me", tags=["Perfil e configurações"])


@router.get("", response_model=schemas.UserRead)
def read_profile(user: CurrentUser):
    return user


@router.patch("", response_model=schemas.UserRead)
def update_profile(data: schemas.UserUpdate, db: Db, user: CurrentUser):
    changes = data.changes()
    if "interests" in changes:
        user.interests = get_or_create_many(db, Technology, user.id, changes.pop("interests"))
    for field, value in changes.items():
        setattr(user, field, value)
    db.commit()
    return user


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(data: schemas.DeleteAccountRequest, db: Db, user: CurrentUser, response: Response):
    if not auth_service.verify_password(user.password_hash, data.password):
        raise ValidationFailed("Senha incorreta.")
    db.delete(user)
    db.commit()
    clear_session_cookie(response)


@router.get("/settings", response_model=schemas.SettingsRead)
def read_settings(user: CurrentUser):
    return user.settings


@router.patch("/settings", response_model=schemas.SettingsRead)
def update_settings(data: schemas.SettingsUpdate, db: Db, user: CurrentUser):
    for field, value in data.changes().items():
        setattr(user.settings, field, value)
    db.commit()
    return user.settings
