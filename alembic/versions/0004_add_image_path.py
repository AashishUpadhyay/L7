"""add image_path to movies

Revision ID: 0004_add_image_path
Revises: 0003_movie_genres
Create Date: 2026-02-06

"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004_add_image_path"
down_revision = "0003_movie_genres"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "movies",
        sa.Column("image_path", sa.String(500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("movies", "image_path")
