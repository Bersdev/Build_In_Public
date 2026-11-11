from datetime import date, datetime

from sqlalchemy import Date, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UTCDateTime, utcnow
from app.modules.catalog.models import Technology


class StudySession(Base):
    """Única fonte de tempo de estudo. O Dashboard soma apenas esta tabela."""

    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    technology_id: Mapped[int | None] = mapped_column(ForeignKey("technologies.id", ondelete="SET NULL"))
    study_date: Mapped[date] = mapped_column(Date, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)

    technology: Mapped[Technology | None] = relationship()
    journal_entry: Mapped["JournalEntry | None"] = relationship(back_populates="study_session")

    @property
    def technology_name(self) -> str | None:
        return self.technology.name if self.technology else None

    @property
    def journal_entry_id(self) -> int | None:
        return self.journal_entry.id if self.journal_entry else None
