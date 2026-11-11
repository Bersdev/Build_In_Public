from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UTCDateTime, utcnow
from app.core.enums import Priority, TaskStatus, enum_column
from app.modules.catalog.models import Technology
from app.modules.projects.models import Project


class Task(Base):
    __tablename__ = "tasks"

    # Calculado pelo serviço, pois depende do "hoje" no fuso do usuário. Não vai para o banco.
    is_overdue = False

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(60))
    priority: Mapped[Priority] = mapped_column(enum_column(Priority), default=Priority.MEDIUM)
    status: Mapped[TaskStatus] = mapped_column(enum_column(TaskStatus), default=TaskStatus.TODO, index=True)
    due_date: Mapped[date | None] = mapped_column(Date, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    technology_id: Mapped[int | None] = mapped_column(ForeignKey("technologies.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    project: Mapped[Project | None] = relationship(back_populates="tasks")
    technology: Mapped[Technology | None] = relationship()

    @property
    def technology_name(self) -> str | None:
        return self.technology.name if self.technology else None

    @property
    def project_name(self) -> str | None:
        return self.project.name if self.project else None
