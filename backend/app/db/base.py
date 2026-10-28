"""Declarative base, shared timestamp mixin and database ID type.

SQLite only auto-increments `INTEGER PRIMARY KEY`; MySQL should use BIGINT.
`ID_TYPE` keeps both dialects working without duplicating model definitions.
"""

from datetime import UTC, datetime

from sqlalchemy import BigInteger, DateTime, Integer, MetaData
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


ID_TYPE = BigInteger().with_variant(Integer(), "sqlite")


def utcnow() -> datetime:
    """Store naive UTC for consistent MySQL DATETIME round-trips."""
    return datetime.now(UTC).replace(tzinfo=None)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    __table_args__ = {"mysql_default_charset": "utf8mb4", "mysql_engine": "InnoDB"}


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )
