from fastapi import APIRouter, status

from app.core.database import Db
from app.modules.auth.dependencies import CurrentUser
from app.modules.imports import schemas, service

router = APIRouter(prefix="/imports", tags=["Importação com IA"])


@router.get("/ai-status", response_model=schemas.AiStatus)
def ai_status(_user: CurrentUser):
    return service.ai_status()


@router.post("/analyze", response_model=schemas.AnalyzeResponse)
def analyze(data: schemas.AnalyzeRequest, user: CurrentUser):
    return service.analyze(user, data.content)


@router.post("/apply", response_model=schemas.ApplyResult, status_code=status.HTTP_201_CREATED)
def apply(data: schemas.ApplyRequest, db: Db, user: CurrentUser):
    return service.apply(db, user, data.plan)
