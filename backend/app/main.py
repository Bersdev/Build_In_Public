from urllib.parse import urlparse

from fastapi import APIRouter, Depends, FastAPI, Request
from fastapi.responses import JSONResponse

import app.models  # noqa: F401  registra todas as tabelas
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.modules.analytics.router import router as analytics_router
from app.modules.auth.dependencies import write_budget
from app.modules.auth.router import router as auth_router
from app.modules.catalog.router import router as catalog_router
from app.modules.gamification.router import router as gamification_router
from app.modules.goals.router import router as goals_router
from app.modules.imports.router import router as imports_router
from app.modules.journal.router import router as journal_router
from app.modules.learning.router import router as learning_router
from app.modules.projects.router import router as projects_router
from app.modules.study_sessions.router import router as study_sessions_router
from app.modules.tasks.router import router as tasks_router
from app.modules.users.router import router as users_router

app = FastAPI(title="DevTrack API")
register_error_handlers(app)

UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _origin_allowed(request: Request) -> bool:
    """O navegador manda Origin em toda requisição que altera dados. Só aceitamos o próprio app.

    Sem Origin (curl, testes) a requisição passa: quem não é navegador não carrega o cookie de ninguém.
    """
    origin = request.headers.get("origin")
    if origin is None:
        return True
    parsed = urlparse(origin)
    if not parsed.scheme or not parsed.netloc:  # "null" e afins
        return False
    front = urlparse(get_settings().frontend_url)
    return parsed.netloc == request.headers.get("host") or (parsed.scheme, parsed.netloc) == (front.scheme, front.netloc)


@app.middleware("http")
async def protect(request: Request, call_next):
    if request.method in UNSAFE_METHODS and not _origin_allowed(request):
        response = JSONResponse({"detail": "Origem não permitida."}, status_code=403)
    else:
        response = await call_next(request)
    # Respostas têm dados da pessoa logada: nenhum cache (navegador, CDN) pode guardá-las.
    response.headers["Cache-Control"] = "no-store"
    return response


api = APIRouter(prefix="/api/v1", dependencies=[Depends(write_budget)])
for module_router in (
    auth_router,
    users_router,
    catalog_router,
    study_sessions_router,
    journal_router,
    projects_router,
    tasks_router,
    learning_router,
    goals_router,
    gamification_router,
    analytics_router,
    imports_router,
):
    api.include_router(module_router)
app.include_router(api)


@app.get("/health")
def health_check():
    return {"status": "ok"}
