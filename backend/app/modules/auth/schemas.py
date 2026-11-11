from typing import Annotated

from pydantic import EmailStr, StringConstraints

from app.core.schemas import Schema
from app.modules.users.schemas import Timezone

# Espaços fazem parte da senha: strip_whitespace=False impede que sejam removidos.
Password = Annotated[str, StringConstraints(strip_whitespace=False, max_length=128)]
NewPassword = Annotated[str, StringConstraints(strip_whitespace=False, min_length=10, max_length=128)]


class RegisterRequest(Schema):
    name: Annotated[str, StringConstraints(min_length=1, max_length=120)]
    email: EmailStr
    password: NewPassword
    timezone: Timezone | None = None


class LoginRequest(Schema):
    email: EmailStr
    password: Password


class ForgotPasswordRequest(Schema):
    email: EmailStr


class ResetPasswordRequest(Schema):
    token: Annotated[str, StringConstraints(max_length=200)]
    new_password: NewPassword


class ChangePasswordRequest(Schema):
    current_password: Password
    new_password: NewPassword
