from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.models.movies import Movie
from app.db.session import get_db
from app.schemas.movie import MovieCreate, MovieResponse

router = APIRouter(prefix="/movies", tags=["movies"])


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
