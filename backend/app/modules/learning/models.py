from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UTCDateTime, utcnow
from app.core.enums import CourseStatus, enum_column
from app.modules.catalog.models import Technology


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    provider: Mapped[str | None] = mapped_column(String(100))
    url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[CourseStatus] = mapped_column(enum_column(CourseStatus), default=CourseStatus.PLANNED)
    start_date: Mapped[date | None] = mapped_column(Date)
    target_date: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)


class LearningPath(Base):
    __tablename__ = "learning_paths"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    technology_id: Mapped[int | None] = mapped_column(ForeignKey("technologies.id", ondelete="SET NULL"))
    start_date: Mapped[date | None] = mapped_column(Date)
    target_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    technology: Mapped[Technology | None] = relationship()
    stages: Mapped[list["LearningPathStage"]] = relationship(
        back_populates="path", cascade="all, delete-orphan", order_by="LearningPathStage.position"
    )

    @property
    def technology_name(self) -> str | None:
        return self.technology.name if self.technology else None

    @property
    def total_items(self) -> int:
        return sum(len(stage.items) for stage in self.stages)

    @property
    def completed_items(self) -> int:
        return sum(1 for stage in self.stages for item in stage.items if item.completed_at)

    @property
    def progress_percent(self) -> int:
        return round(self.completed_items * 100 / self.total_items) if self.total_items else 0


class LearningPathStage(Base):
    __tablename__ = "learning_path_stages"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    path_id: Mapped[int] = mapped_column(ForeignKey("learning_paths.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int] = mapped_column(Integer, default=0)

    path: Mapped[LearningPath] = relationship(back_populates="stages")
    items: Mapped[list["LearningPathItem"]] = relationship(
        back_populates="stage", cascade="all, delete-orphan", order_by="LearningPathItem.position"
    )


class LearningPathItem(Base):
    __tablename__ = "learning_path_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    stage_id: Mapped[int] = mapped_column(ForeignKey("learning_path_stages.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    url: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"))
    position: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    stage: Mapped[LearningPathStage] = relationship(back_populates="items")
    course: Mapped[Course | None] = relationship()

    @property
    def course_title(self) -> str | None:
        return self.course.title if self.course else None
