"""init

Revision ID: 0001_init
Revises: 
Create Date: 2026-02-05

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "persons",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_persons_email", "persons", ["email"], unique=True)

    # Create enum only if it doesn't exist (e.g. after a previous partial run)
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'genre') THEN
                CREATE TYPE genre AS ENUM (
                    'Action', 'Comedy', 'Drama', 'Horror', 'SciFi', 'Thriller',
                    'Fantasy', 'Romance', 'Animation', 'Adventure', 'Family',
                    'Mystery', 'War', 'Western', 'Crime', 'Documentary',
                    'Biography', 'History'
                );
            END IF;
        END
        $$;
        """
    )

    # Use PostgreSQL ENUM that references existing type (no CREATE TYPE)
    genre_enum = postgresql.ENUM(
        "Action", "Comedy", "Drama", "Horror", "SciFi", "Thriller", "Fantasy",
        "Romance", "Animation", "Adventure", "Family", "Mystery", "War", "Western",
        "Crime", "Documentary", "Biography", "History",
        name="genre",
        create_type=False,
    )

    op.create_table(
        "movies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("release_date", sa.Date(), nullable=True),
        sa.Column("genre", genre_enum, nullable=False),
        sa.Column("rating", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_movies_title", "movies", ["title"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_movies_title", table_name="movies")
    op.drop_table("movies")
    op.execute("DROP TYPE genre")

    op.drop_index("ix_persons_email", table_name="persons")
    op.drop_table("persons")

