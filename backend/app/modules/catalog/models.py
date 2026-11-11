from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, declared_attr, mapped_column

from app.core.database import Base


class _NamedPerUser:
    """Nome único por usuário, sem diferenciar maiúsculas de minúsculas."""

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    normalized_name: Mapped[str] = mapped_column(String(60))

    @declared_attr.directive
    def __table_args__(cls):
        return (UniqueConstraint("user_id", "normalized_name", name=f"uq_{cls.__tablename__}_user_name"),)


class Technology(_NamedPerUser, Base):
    __tablename__ = "technologies"


class Tag(_NamedPerUser, Base):
    __tablename__ = "tags"


class Category(_NamedPerUser, Base):
    __tablename__ = "categories"
