from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.sql import exists, func

from app.db.models.movie_genre import MovieGenre
from app.db.models.movie_person import MoviePerson
from app.db.models.movies import Movie
from app.db.models.person import Person
from app.db.models.role import MovieRole
from app.db.session import get_db
from app.schemas.movie import (
    MovieBulkCreate,
    MovieCreate,
    MovieListResponse,
    MovieResponse,
    MovieSearchRequest,
    MovieUpdate,
)
from app.schemas.movie_person import AddPersonToMovieRequest, MoviePersonResponse

router = APIRouter(prefix="/movies", tags=["movies"])


def _get_movie(movie_id: int, db: Session) -> Movie:
    movie = db.get(Movie, movie_id)
    if movie is None:
        raise HTTPException(status_code=404, detail="Movie not found")
    return movie


def _get_person(person_id: int, db: Session) -> Person:
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.get(
    "",
    response_model=MovieListResponse,
    summary="List movies",
    description="Returns a paginated list of all movies. Use `skip` and `limit` for paging. For search with filters, use POST /movies/search.",
    responses={
        200: {"description": "Paginated list of movies returned successfully."},
    },
)
def list_movies(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip (for paging)."),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return (1–100)."
    ),
) -> MovieListResponse:
    """List movies with paging."""
    total = db.query(Movie).count()
    items = db.execute(select(Movie).offset(skip).limit(limit).order_by(Movie.id)).scalars().all()
    return MovieListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post(
    "/search",
    response_model=MovieListResponse,
    summary="Search movies",
    description="Search movies by genres (OR), director, release year, or actor_ids (OR). Request body supports optional filters and paging (skip, limit).",
    responses={
        200: {"description": "Paginated search results returned successfully."},
    },
)
def search_movies(
    payload: MovieSearchRequest,
    db: Session = Depends(get_db),
) -> MovieListResponse:
    """Search movies with optional filters and paging. Genres and actor_ids use OR."""
    base = select(Movie)
    if payload.genres:
        base = (
            base.join(MovieGenre, MovieGenre.movie_id == Movie.id)
            .where(MovieGenre.genre.in_(payload.genres))
            .distinct()
        )
    if payload.release_year is not None:
        base = base.where(func.extract("year", Movie.release_date) == payload.release_year)
    if payload.director_id is not None:
        director_exists = exists().where(
            MoviePerson.movie_id == Movie.id,
            MoviePerson.person_id == payload.director_id,
            MoviePerson.role == MovieRole.Director,
        )
        base = base.where(director_exists)
    if payload.actor_ids:
        actor_exists = exists().where(
            MoviePerson.movie_id == Movie.id,
            MoviePerson.person_id.in_(payload.actor_ids),
            MoviePerson.role == MovieRole.Actor,
        )
        base = base.where(actor_exists)

    count_stmt = select(func.count()).select_from(base.subquery())
    total = db.execute(count_stmt).scalar_one()
    items = (
        db.execute(base.order_by(Movie.id).offset(payload.skip).limit(payload.limit))
        .scalars()
        .all()
    )
    return MovieListResponse(items=items, total=total, skip=payload.skip, limit=payload.limit)


@router.get(
    "/{movie_id}",
    response_model=MovieResponse,
    summary="Get movie by ID",
    description="Returns a single movie by its unique identifier.",
    responses={
        200: {"description": "Movie found and returned."},
        404: {"description": "Movie not found."},
    },
)
def get_movie(movie_id: int, db: Session = Depends(get_db)) -> Movie:
    """Get a single movie by id."""
    return _get_movie(movie_id, db)


@router.post(
    "",
    response_model=MovieResponse,
    status_code=201,
    summary="Create movie",
    description="Creates a new movie with title, description, release date, genres (at least one), and optional rating.",
    responses={
        201: {"description": "Movie created successfully."},
    },
)
def create_movie(payload: MovieCreate, db: Session = Depends(get_db)) -> Movie:
    movie = Movie(
        title=payload.title,
        description=payload.description,
        release_date=payload.release_date,
        rating=payload.rating,
    )
    db.add(movie)
    db.flush()
    for g in payload.genres:
        db.add(MovieGenre(movie_id=movie.id, genre=g))
    db.commit()
    db.refresh(movie)
    return movie


@router.post(
    "/bulk",
    response_model=list[MovieResponse],
    status_code=201,
    summary="Bulk create movies",
    description="Creates multiple movies in a single request. Maximum 300 movies per request.",
    responses={
        201: {"description": "Movies created successfully."},
    },
)
def bulk_create_movies(payload: MovieBulkCreate, db: Session = Depends(get_db)) -> list[Movie]:
    """Create multiple movies. Maximum 300 per request."""
    created: list[Movie] = []
    for m in payload.movies:
        movie = Movie(
            title=m.title,
            description=m.description,
            release_date=m.release_date,
            rating=m.rating,
        )
        db.add(movie)
        db.flush()
        for g in m.genres:
            db.add(MovieGenre(movie_id=movie.id, genre=g))
        created.append(movie)
    db.commit()
    for movie in created:
        db.refresh(movie)
    return created


@router.patch(
    "/{movie_id}",
    response_model=MovieResponse,
    summary="Update movie",
    description="Partially updates a movie. Only provided fields are updated.",
    responses={
        200: {"description": "Movie updated successfully."},
        404: {"description": "Movie not found."},
    },
)
def update_movie(
    movie_id: int,
    payload: MovieUpdate,
    db: Session = Depends(get_db),
) -> Movie:
    """Update a movie (partial update)."""
    movie = _get_movie(movie_id, db)
    data = payload.model_dump(exclude_unset=True)
    genres = data.pop("genres", None)
    for key, value in data.items():
        setattr(movie, key, value)
    if genres is not None:
        db.execute(delete(MovieGenre).where(MovieGenre.movie_id == movie_id))
        for g in genres:
            db.add(MovieGenre(movie_id=movie_id, genre=g))
    db.commit()
    db.refresh(movie)
    return movie


@router.delete(
    "/{movie_id}",
    status_code=204,
    summary="Delete movie",
    description="Deletes a movie by ID. Returns no content on success.",
    responses={
        204: {"description": "Movie deleted successfully."},
        404: {"description": "Movie not found."},
    },
)
def delete_movie(movie_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a movie."""
    movie = _get_movie(movie_id, db)
    db.delete(movie)
    db.commit()


@router.post(
    "/{movie_id}/persons",
    response_model=list[MoviePersonResponse],
    status_code=201,
    summary="Add persons to movie",
    description="Associates one or more persons with a movie in given roles (Actor, Director, or Producer). Each person can have only one role per movie. A movie can have only one director.",
    responses={
        201: {"description": "Persons added to movie successfully."},
        404: {"description": "Movie or person not found."},
        409: {
            "description": "A person is already assigned to this movie in this role, or movie already has a director (when adding Director)."
        },
    },
)
def add_person_to_movie(
    movie_id: int,
    payload: list[AddPersonToMovieRequest],
    db: Session = Depends(get_db),
) -> list[MoviePerson]:
    """Add one or more persons to a movie in given roles (Actor, Director, Producer)."""
    _get_movie(movie_id, db)
    directors_in_request = sum(1 for p in payload if p.role == MovieRole.Director)
    if directors_in_request > 1:
        raise HTTPException(
            status_code=409,
            detail="Movie can have only one director.",
        )
    if directors_in_request == 1:
        existing = (
            db.execute(
                select(MoviePerson).where(
                    MoviePerson.movie_id == movie_id,
                    MoviePerson.role == MovieRole.Director,
                )
            )
            .scalars()
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=409,
                detail="Movie can have only one director.",
            )
    seen = set()
    for item in payload:
        _get_person(item.person_id, db)
        key = (item.person_id, item.role)
        if key in seen:
            raise HTTPException(
                status_code=409,
                detail=f"Duplicate assignment in request: person_id={item.person_id} role={item.role}.",
            )
        seen.add(key)
        existing_link = (
            db.execute(
                select(MoviePerson).where(
                    MoviePerson.movie_id == movie_id,
                    MoviePerson.person_id == item.person_id,
                    MoviePerson.role == item.role,
                )
            )
            .scalars()
            .first()
        )
        if existing_link is not None:
            raise HTTPException(
                status_code=409,
                detail="This person is already assigned to this movie in this role.",
            )
    created: list[MoviePerson] = []
    for item in payload:
        link = MoviePerson(
            movie_id=movie_id,
            person_id=item.person_id,
            role=item.role,
        )
        db.add(link)
        created.append(link)
    try:
        db.commit()
        for link in created:
            db.refresh(link)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This person is already assigned to this movie in this role.",
        ) from e
    return created
