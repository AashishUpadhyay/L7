"""movie_persons

Revision ID: 0002_movie_persons
Revises: 0001_init
Create Date: 2026-02-05

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0002_movie_persons"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movie_role') THEN
                CREATE TYPE movie_role AS ENUM ('Actor', 'Director', 'Producer');
            END IF;
        END
        $$;
        """
    )

    movie_role_enum = postgresql.ENUM(
        "Actor", "Director", "Producer",
        name="movie_role",
        create_type=False,
    )

    op.create_table(
        "movie_persons",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "movie_id",
            sa.Integer(),
            sa.ForeignKey("movies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "person_id",
            sa.Integer(),
            sa.ForeignKey("persons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", movie_role_enum, nullable=False),
    )
    op.create_index("ix_movie_persons_movie_id", "movie_persons", ["movie_id"], unique=False)
    op.create_index("ix_movie_persons_person_id", "movie_persons", ["person_id"], unique=False)
    op.create_unique_constraint(
        "uq_movie_person_role",
        "movie_persons",
        ["movie_id", "person_id", "role"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_movie_person_role", "movie_persons", type_="unique")
    op.drop_index("ix_movie_persons_person_id", table_name="movie_persons")
    op.drop_index("ix_movie_persons_movie_id", table_name="movie_persons")
    op.drop_table("movie_persons")
    op.execute("DROP TYPE movie_role")
