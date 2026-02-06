"""Admin endpoints for database reset and seed."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.clean_db import run_clean
from app.db.models.movies import Movie
from app.db.models.person import Person
from app.db.seed import run_seed
from app.db.session import get_db

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get(
    "/stats",
    summary="Get database statistics",
    description="Returns statistics about the database including total movies and total persons.",
)
def get_stats(db: Session = Depends(get_db)) -> dict:
    """Get database statistics."""
    total_movies = db.query(Movie).count()
    total_persons = db.query(Person).count()
    return {
        "total_movies": total_movies,
        "total_professionals": total_persons,
    }


@router.post(
    "/db/clean",
    summary="Clean database",
    description="Truncate all movies and persons (and related rows). Use with caution.",
)
def admin_db_clean() -> dict:
    run_clean()
    return {"status": "ok", "message": "Database cleaned (all movies and persons removed)."}


@router.post(
    "/db/seed",
    summary="Seed database",
    description="Load data from app/db/data.json. Only inserts if the database has no movies.",
)
def admin_db_seed() -> dict:
    seeded = run_seed()
    if seeded:
        return {"status": "ok", "message": "Database seeded from data.json."}
    return {"status": "skipped", "message": "Database already has data or data.json missing."}


@router.post(
    "/db/reset",
    summary="Reset database",
    description="Clean then seed: truncate all data and load from data.json.",
)
def admin_db_reset() -> dict:
    run_clean()
    seeded = run_seed()
    return {
        "status": "ok",
        "message": "Database reset: cleaned and seeded."
        if seeded
        else "Database reset: cleaned (seed skipped).",
    }
