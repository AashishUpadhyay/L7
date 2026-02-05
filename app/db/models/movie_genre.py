from __future__ import annotations

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, PrimaryKeyConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.genre import Genre


class MovieGenre(Base):
    """Association: a movie has many genres. Composite PK (movie_id, genre)."""

    __tablename__ = "movie_genres"
    __table_args__ = (PrimaryKeyConstraint("movie_id", "genre", name="pk_movie_genres"),)

    movie_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("movies.id", ondelete="CASCADE"),
        nullable=False,
    )
    genre: Mapped[Genre] = mapped_column(SAEnum(Genre, name="genre"), nullable=False)

    movie: Mapped["Movie"] = relationship("Movie", back_populates="movie_genre_entries")
