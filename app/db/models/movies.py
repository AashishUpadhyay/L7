from __future__ import annotations

import datetime as dt
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Float, Integer, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.genre import Genre

if TYPE_CHECKING:
    from app.db.models.movie_person import MoviePerson


class Movie(Base):
    __tablename__ = "movies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    genre: Mapped[Genre] = mapped_column(SAEnum(Genre, name="genre"), nullable=False)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    movie_persons: Mapped[list[MoviePerson]] = relationship(
        "MoviePerson",
        back_populates="movie",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
