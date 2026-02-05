from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.movies import Movie
from app.db.session import get_db
from app.schemas.movie import (
    MovieBulkCreate,
    MovieCreate,
    MovieListResponse,
    MovieResponse,
    MovieUpdate,
)

router = APIRouter(prefix="/movies", tags=["movies"])


def _get_movie(movie_id: int, db: Session) -> Movie:
    movie = db.get(Movie, movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


@router.get("", response_model=MovieListResponse)
def list_movies(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> MovieListResponse:
    """List movies with paging."""
    total = db.query(Movie).count()
    items = (
        db.execute(select(Movie).offset(skip).limit(limit).order_by(Movie.id))
        .scalars()
        .all()
    )
    return MovieListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{movie_id}", response_model=MovieResponse)
def get_movie(movie_id: int, db: Session = Depends(get_db)) -> Movie:
    """Get a single movie by id."""
    return _get_movie(movie_id, db)


@router.post("", response_model=MovieResponse, status_code=201)
def create_movie(payload: MovieCreate, db: Session = Depends(get_db)) -> Movie:
    movie = Movie(
        title=payload.title,
        description=payload.description,
        release_date=payload.release_date,
        genre=payload.genre,
        rating=payload.rating,
    )
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return movie


@router.post("/bulk", response_model=list[MovieResponse], status_code=201)
def bulk_create_movies(
    payload: MovieBulkCreate, db: Session = Depends(get_db)
) -> list[Movie]:
    """Create multiple movies. Maximum 300 per request."""
    created: list[Movie] = []
    for m in payload.movies:
        movie = Movie(
            title=m.title,
            description=m.description,
            release_date=m.release_date,
            genre=m.genre,
            rating=m.rating,
        )
        db.add(movie)
        created.append(movie)
    db.commit()
    for movie in created:
        db.refresh(movie)
    return created


@router.patch("/{movie_id}", response_model=MovieResponse)
def update_movie(
    movie_id: int,
    payload: MovieUpdate,
    db: Session = Depends(get_db),
) -> Movie:
    """Update a movie (partial update)."""
    movie = _get_movie(movie_id, db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(movie, key, value)
    db.commit()
    db.refresh(movie)
    return movie


@router.delete("/{movie_id}", status_code=204)
def delete_movie(movie_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a movie."""
    movie = _get_movie(movie_id, db)
    db.delete(movie)
    db.commit()
