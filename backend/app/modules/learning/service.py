from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import utcnow
from app.core.dates import reject_inverted_dates
from app.core.enums import CourseStatus
from app.modules.activity.service import record_activity
from app.modules.auth.models import User
from app.modules.catalog.models import Technology
from app.modules.catalog.service import get_or_create, get_owned
from app.modules.gamification import rules
from app.modules.gamification.service import evaluate_achievements, revoke_xp, sync_xp
from app.modules.learning import schemas
from app.modules.learning.csv_import import ParsedStage, parse_roadmap_csv
from app.modules.learning.models import Course, LearningPath, LearningPathItem, LearningPathStage


def _sync_course_completion(db: Session, course: Course) -> None:
    if course.status == CourseStatus.COMPLETED and course.completed_at is None:
        course.completed_at = utcnow()
        sync_xp(db, course.user_id, rules.COURSE_COMPLETED, course.id, rules.XP_RULES[rules.COURSE_COMPLETED])
        record_activity(db, course.user_id, "course_completed", f"Curso concluído: {course.title}", "course", course.id)
    elif course.status != CourseStatus.COMPLETED and course.completed_at is not None:
        course.completed_at = None
        revoke_xp(db, course.user_id, rules.COURSE_COMPLETED, course.id)


def create_course(db: Session, user: User, data: schemas.CourseCreate) -> Course:
    reject_inverted_dates(data.start_date, data.target_date)
    course = Course(user_id=user.id, **data.model_dump())
    db.add(course)
    db.flush()
    _sync_course_completion(db, course)
    evaluate_achievements(db, user.id)
    db.commit()
    return course


def update_course(db: Session, user: User, course_id: int, data: schemas.CourseUpdate) -> Course:
    course = get_owned(db, Course, course_id, user.id)
    for field, value in data.changes().items():
        setattr(course, field, value)
    reject_inverted_dates(course.start_date, course.target_date)
    _sync_course_completion(db, course)
    evaluate_achievements(db, user.id)
    db.commit()
    return course


def delete_course(db: Session, user: User, course_id: int) -> None:
    course = get_owned(db, Course, course_id, user.id)
    revoke_xp(db, user.id, rules.COURSE_COMPLETED, course.id)
    db.delete(course)
    db.commit()


def list_courses(db: Session, user_id: int) -> list[Course]:
    return list(db.scalars(select(Course).where(Course.user_id == user_id).order_by(Course.id.desc())))


def _apply_path(db: Session, path: LearningPath, changes: dict) -> None:
    if "technology" in changes:
        name = changes.pop("technology")
        path.technology = get_or_create(db, Technology, path.user_id, name) if name else None
    for field, value in changes.items():
        setattr(path, field, value)
    reject_inverted_dates(path.start_date, path.target_date)


def create_path(db: Session, user: User, data: schemas.PathCreate) -> LearningPath:
    path = LearningPath(user_id=user.id, title=data.title)
    db.add(path)
    _apply_path(db, path, data.model_dump())
    db.commit()
    return path


def import_path(db: Session, user: User, data: schemas.PathImport) -> LearningPath:
    """Cria a trilha inteira de uma vez: ou tudo é salvo, ou nada (um único commit)."""
    path = add_path(db, user, data.title, data.technology, None, parse_roadmap_csv(data.content))
    record_activity(db, user.id, "learning_path_imported", f"Roadmap importado: {path.title}", "learning", path.id)
    db.commit()
    db.refresh(path)
    return path


def add_path(
    db: Session,
    user: User,
    title: str,
    technology: str | None,
    description: str | None,
    stages: list[ParsedStage],
) -> LearningPath:
    """Monta trilha, etapas e conteúdos sem commit, para quem chama decidir quando salvar."""
    path = LearningPath(user_id=user.id, title=title)
    db.add(path)
    _apply_path(db, path, {"technology": technology, "description": description})
    for stage_position, parsed in enumerate(stages):
        stage = LearningPathStage(user_id=user.id, title=parsed.title, position=stage_position)
        path.stages.append(stage)
        for item_position, item in enumerate(parsed.items):
            stage.items.append(
                LearningPathItem(
                    user_id=user.id, title=item.title, url=item.url, notes=item.notes, position=item_position
                )
            )
    db.flush()
    return path


def update_path(db: Session, user: User, path_id: int, data: schemas.PathUpdate) -> LearningPath:
    path = get_owned(db, LearningPath, path_id, user.id)
    _apply_path(db, path, data.changes())
    db.commit()
    return path


def _revoke_items_xp(db: Session, user_id: int, items: list[LearningPathItem]) -> None:
    for item in items:
        revoke_xp(db, user_id, rules.ITEM_COMPLETED, item.id)


def delete_path(db: Session, user: User, path_id: int) -> None:
    path = get_owned(db, LearningPath, path_id, user.id)
    _revoke_items_xp(db, user.id, [item for stage in path.stages for item in stage.items])
    db.delete(path)
    db.commit()


def list_paths(db: Session, user_id: int) -> list[LearningPath]:
    return list(db.scalars(select(LearningPath).where(LearningPath.user_id == user_id).order_by(LearningPath.id.desc())))


def create_stage(db: Session, user: User, path_id: int, title: str) -> LearningPathStage:
    path = get_owned(db, LearningPath, path_id, user.id)
    stage = LearningPathStage(user_id=user.id, path_id=path.id, title=title, position=len(path.stages))
    db.add(stage)
    db.commit()
    return stage


def update_stage(db: Session, user: User, stage_id: int, data: schemas.StageUpdate) -> LearningPathStage:
    stage = get_owned(db, LearningPathStage, stage_id, user.id)
    for field, value in data.changes().items():
        setattr(stage, field, value)
    db.commit()
    return stage


def delete_stage(db: Session, user: User, stage_id: int) -> None:
    stage = get_owned(db, LearningPathStage, stage_id, user.id)
    _revoke_items_xp(db, user.id, stage.items)
    db.delete(stage)
    db.commit()


def create_item(db: Session, user: User, stage_id: int, data: schemas.ItemCreate) -> LearningPathItem:
    stage = get_owned(db, LearningPathStage, stage_id, user.id)
    if data.course_id is not None:
        get_owned(db, Course, data.course_id, user.id)
    item = LearningPathItem(user_id=user.id, stage_id=stage.id, position=len(stage.items), **data.model_dump())
    db.add(item)
    db.commit()
    return item


def update_item(db: Session, user: User, item_id: int, data: schemas.ItemUpdate) -> LearningPathItem:
    item = get_owned(db, LearningPathItem, item_id, user.id)
    changes = data.changes()
    if changes.get("course_id") is not None:
        get_owned(db, Course, changes["course_id"], user.id)
    completed = changes.pop("completed", None)
    for field, value in changes.items():
        setattr(item, field, value)
    if completed is True and item.completed_at is None:
        item.completed_at = utcnow()
        sync_xp(db, user.id, rules.ITEM_COMPLETED, item.id, rules.XP_RULES[rules.ITEM_COMPLETED])
        record_activity(db, user.id, "learning_item_completed", f"Conteúdo concluído: {item.title}", "learning", item.id)
    elif completed is False and item.completed_at is not None:
        item.completed_at = None
        revoke_xp(db, user.id, rules.ITEM_COMPLETED, item.id)
    evaluate_achievements(db, user.id)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, user: User, item_id: int) -> None:
    item = get_owned(db, LearningPathItem, item_id, user.id)
    revoke_xp(db, user.id, rules.ITEM_COMPLETED, item.id)
    db.delete(item)
    db.commit()
