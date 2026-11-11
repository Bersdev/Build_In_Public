from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 400
    default_detail = "Requisição inválida."

    def __init__(self, detail: str | None = None):
        super().__init__(detail or self.default_detail)
        self.detail = detail or self.default_detail


class NotFoundError(AppError):
    status_code = 404
    default_detail = "Registro não encontrado."


class ConflictError(AppError):
    status_code = 409
    default_detail = "Este registro já existe."


class UnauthorizedError(AppError):
    status_code = 401
    default_detail = "É preciso entrar na conta."


class ValidationFailed(AppError):
    status_code = 422


_MESSAGES = {
    "missing": "Campo obrigatório.",
    "string_too_short": "Texto muito curto.",
    "string_too_long": "Texto muito longo.",
    "greater_than": "Valor muito baixo.",
    "greater_than_equal": "Valor muito baixo.",
    "less_than": "Valor muito alto.",
    "less_than_equal": "Valor muito alto.",
    "date_from_datetime_parsing": "Data inválida.",
    "date_parsing": "Data inválida.",
    "int_parsing": "Informe um número inteiro.",
    "float_parsing": "Informe um número.",
    "enum": "Opção inválida.",
    "literal_error": "Opção inválida.",
}


def _message(error: dict) -> str:
    if error["type"] == "value_error":
        return error["msg"].removeprefix("Value error, ")
    return _MESSAGES.get(error["type"], "Valor inválido.")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    def handle_app_error(_request: Request, error: AppError):
        return JSONResponse({"detail": error.detail}, status_code=error.status_code)

    @app.exception_handler(RequestValidationError)
    def handle_validation_error(_request: Request, error: RequestValidationError):
        # O formato padrão repete o valor enviado, o que devolveria senhas na resposta.
        errors = [
            {"field": ".".join(str(part) for part in item["loc"][1:]), "message": _message(item)}
            for item in error.errors()
        ]
        return JSONResponse({"detail": "Confira os campos informados.", "errors": errors}, status_code=422)
