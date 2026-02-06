"""Truncate all app tables (clean the database)."""

from __future__ import annotations

from sqlalchemy import text

from app.db.session import engine


def run_clean() -> None:
    """Truncate movies and persons (and dependent tables via CASCADE)."""
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE movies, persons CASCADE"))
        conn.commit()


def main() -> None:
    run_clean()
    print("Database cleaned (all movies and persons removed).")


if __name__ == "__main__":
    main()
