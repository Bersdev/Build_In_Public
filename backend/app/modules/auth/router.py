from fastapi import APIRouter, Request, Response, status

from app.core.config import get_settings
from app.core.rate_limit import client_ip
from app.core.database import Db
from app.modules.auth import schemas, service
from app.modules.auth.dependencies import CurrentUser
from app.modules.auth.models import User
from app.modules.users.schemas import UserRead

router = APIRouter(prefix="/auth", tags=["Autenticação"])


def _start_session(db, response: Response, user: User) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.cookie_name,
        service.create_session(db, user),
        max_age=settings.session_days * 86_400,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(get_settings().cookie_name, path="/")


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: schemas.RegisterRequest, request: Request, db: Db, response: Response):
    service.throttle(db, "register", client_ip(request), service.REGISTER_PER_IP, service.HOUR)
    user = service.register(db, data.name, data.email, data.password, data.timezone)
    _start_session(db, response, user)
    return user


@router.post("/login", response_model=UserRead)
def login(data: schemas.LoginRequest, request: Request, db: Db, response: Response):
    user = service.login(db, data.email, data.password, client_ip(request))
    _start_session(db, response, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, db: Db, response: Response):
    service.logout(db, request.cookies.get(get_settings().cookie_name))
    clear_session_cookie(response)


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser):
    return user


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(data: schemas.ForgotPasswordRequest, request: Request, db: Db):
    service.throttle(db, "forgot", client_ip(request), service.FORGOT_PASSWORD_PER_IP, service.HOUR)
    # A resposta é a mesma para qualquer e-mail, para não revelar quem tem conta.
    service.request_password_reset(db, data.email)
    return {"detail": "Se o e-mail estiver cadastrado, enviaremos as instruções."}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(data: schemas.ResetPasswordRequest, db: Db):
    service.reset_password(db, data.token, data.new_password)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(data: schemas.ChangePasswordRequest, request: Request, db: Db, user: CurrentUser):
    token = request.cookies.get(get_settings().cookie_name)
    service.change_password(db, user, data.current_password, data.new_password, token)
