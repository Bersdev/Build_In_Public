from fastapi import APIRouter, FastAPI

import app.models  # noqa: F401  registra todas as tabelas
from app.core.errors import register_error_handlers
from app.modules.analytics.router import router as analytics_router
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

app = FastAPI(title="Build in Public API")
register_error_handlers(app)

api = APIRouter(prefix="/api/v1")
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
