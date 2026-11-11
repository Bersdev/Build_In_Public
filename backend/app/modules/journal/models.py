from datetime import date, datetime

from sqlalchemy import Column, Date, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, UTCDateTime, utcnow
from app.modules.catalog.models import Category, Tag, Technology
from app.modules.study_sessions.models import StudySession

journal_technologies = Table(
    "journal_technologies",
    Base.metadata,
    Column("entry_id", ForeignKey("journal_entries.id", ondelete="CASCADE"), primary_key=True),
    Column("technology_id", ForeignKey("technologies.id", ondelete="CASCADE"), primary_key=True),
)
journal_tags = Table(
    "journal_tags",
    Base.metadata,
    Column("entry_id", ForeignKey("journal_entries.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)
journal_categories = Table(
    "journal_categories",
    Base.metadata,
    Column("entry_id", ForeignKey("journal_entries.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    entry_date: Mapped[date] = mapped_column(Date, index=True)
    language: Mapped[str | None] = mapped_column(String(60))
    difficulties: Mapped[str | None] = mapped_column(Text)
    errors: Mapped[str | None] = mapped_column(Text)
    solutions: Mapped[str | None] = mapped_column(Text)
    key_learnings: Mapped[str | None] = mapped_column(Text)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), index=True)
    # O tempo dedicado mora na sessão de estudo ligada, nunca em duas tabelas.
    study_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("study_sessions.id", ondelete="SET NULL"), unique=True
    )
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    technologies: Mapped[list[Technology]] = relationship(secondary=journal_technologies)
    tags: Mapped[list[Tag]] = relationship(secondary=journal_tags)
    categories: Mapped[list[Category]] = relationship(secondary=journal_categories)
    study_session: Mapped[StudySession | None] = relationship(back_populates="journal_entry")
    project: Mapped["Project | None"] = relationship(back_populates="journal_entries")

    @property
    def duration_minutes(self) -> int | None:
        return self.study_session.duration_minutes if self.study_session else None

    @property
    def project_name(self) -> str | None:
        return self.project.name if self.project else None
