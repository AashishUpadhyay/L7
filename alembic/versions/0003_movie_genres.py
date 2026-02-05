"""movie_genres: movies can have multiple genres

Revision ID: 0003_movie_genres
Revises: 0002_movie_persons
Create Date: 2026-02-05

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_movie_genres"
down_revision = "0002_movie_persons"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create movie_genres junction table (genre enum already exists)
    genre_enum = postgresql.ENUM(
        "Action",
        "Comedy",
        "Drama",
        "Horror",
        "SciFi",
        "Thriller",
        "Fantasy",
        "Romance",
        "Animation",
        "Adventure",
        "Family",
        "Mystery",
        "War",
        "Western",
        "Crime",
        "Documentary",
        "Biography",
        "History",
        name="genre",
        create_type=False,
    )

    op.create_table(
        "movie_genres",
        sa.Column(
            "movie_id",
            sa.Integer(),
            sa.ForeignKey("movies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("genre", genre_enum, nullable=False),
        sa.PrimaryKeyConstraint("movie_id", "genre", name="pk_movie_genres"),
    )
    op.create_index("ix_movie_genres_movie_id", "movie_genres", ["movie_id"], unique=False)
    op.create_index("ix_movie_genres_genre", "movie_genres", ["genre"], unique=False)

    # Migrate: one row per movie with its single current genre
    op.execute(
        """
        INSERT INTO movie_genres (movie_id, genre)
        SELECT id, genre FROM movies
        """
    )

    # Drop old genre column from movies
    op.drop_column("movies", "genre")


def downgrade() -> None:
    # Re-add genre column (single); use first genre per movie
    genre_enum = postgresql.ENUM(
        "Action",
        "Comedy",
        "Drama",
        "Horror",
        "SciFi",
        "Thriller",
        "Fantasy",
        "Romance",
        "Animation",
        "Adventure",
        "Family",
        "Mystery",
        "War",
        "Western",
        "Crime",
        "Documentary",
        "Biography",
        "History",
        name="genre",
        create_type=False,
    )
    op.add_column(
        "movies",
        sa.Column("genre", genre_enum, nullable=True),
    )
    op.execute(
        """
        UPDATE movies m
        SET genre = (SELECT mg.genre FROM movie_genres mg WHERE mg.movie_id = m.id LIMIT 1)
        """
    )
    op.alter_column("movies", "genre", nullable=False)

    op.drop_index("ix_movie_genres_genre", table_name="movie_genres")
    op.drop_index("ix_movie_genres_movie_id", table_name="movie_genres")
    op.drop_table("movie_genres")
