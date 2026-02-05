from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models.role import MovieRole

if TYPE_CHECKING:
    from app.db.models.movies import Movie
    from app.db.models.person import Person


class MoviePerson(Base):
    """Association table linking Movies and Persons with a role (Actor, Director, Producer)."""

    __tablename__ = "movie_persons"
    __table_args__ = (
        UniqueConstraint("movie_id", "person_id", "role", name="uq_movie_person_role"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    movie_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False
    )
    person_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[MovieRole] = mapped_column(SAEnum(MovieRole, name="movie_role"), nullable=False)

    # Relationships (optional, for convenient navigation)
    movie: Mapped["Movie"] = relationship("Movie", back_populates="movie_persons")
    person: Mapped["Person"] = relationship("Person", back_populates="movie_persons")
