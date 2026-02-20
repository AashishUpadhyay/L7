from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.sql import exists, func

from app.db.models.movie_genre import MovieGenre
from app.db.models.movie_person import MoviePerson
from app.db.models.movies import Movie
from app.db.models.person import Person
from app.db.models.review import Review
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
from app.schemas.movie_person import (
    AddPersonToMovieRequest,
    MoviePersonResponse,
    PersonInMovieResponse,
)
from app.schemas.review import ReviewCreate, ReviewListResponse, ReviewResponse
from app.storage.config import get_storage

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
    description="Search movies by genres (OR), director, release year range (start_year to end_year, inclusive), or actor_ids (OR). Request body supports optional filters and paging (skip, limit).",
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
    if payload.title and payload.title.strip():
        q = f"%{payload.title.strip()}%"
        base = base.where(or_(Movie.title.ilike(q), Movie.description.ilike(q)))
    if payload.genres:
        base = (
            base.join(MovieGenre, MovieGenre.movie_id == Movie.id)
            .where(MovieGenre.genre.in_(payload.genres))
            .distinct()
        )
    if payload.start_year is not None:
        base = base.where(func.extract("year", Movie.release_date) >= payload.start_year)
    if payload.end_year is not None:
        base = base.where(func.extract("year", Movie.release_date) <= payload.end_year)
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


@router.get(
    "/{movie_id}/persons",
    response_model=list[PersonInMovieResponse],
    summary="Get persons in movie",
    description="Returns all persons associated with a movie along with their roles.",
    responses={
        200: {"description": "List of persons in movie returned successfully."},
        404: {"description": "Movie not found."},
    },
)
def get_movie_persons(movie_id: int, db: Session = Depends(get_db)) -> list[PersonInMovieResponse]:
    """Get all persons associated with a movie."""
    _get_movie(movie_id, db)
    stmt = (
        select(MoviePerson, Person)
        .join(Person, MoviePerson.person_id == Person.id)
        .where(MoviePerson.movie_id == movie_id)
        .order_by(MoviePerson.role, Person.name)
    )
    results = db.execute(stmt).all()
    return [
        PersonInMovieResponse(
            id=mp.id,
            person_id=mp.person_id,
            person_name=person.name,
            person_email=person.email,
            role=mp.role,
        )
        for mp, person in results
    ]


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


@router.delete(
    "/{movie_id}/persons/{person_id}",
    status_code=204,
    summary="Remove person from movie",
    description="Removes a person from a movie in a specific role. If role is not specified, removes all associations between the person and movie.",
    responses={
        204: {"description": "Person removed from movie successfully."},
        404: {"description": "Movie, person, or association not found."},
    },
)
def remove_person_from_movie(
    movie_id: int,
    person_id: int,
    role: MovieRole | None = Query(
        None, description="Specific role to remove. If not provided, removes all roles."
    ),
    db: Session = Depends(get_db),
) -> None:
    """Remove a person from a movie in a specific role or all roles."""
    _get_movie(movie_id, db)
    _get_person(person_id, db)

    if role is not None:
        stmt = delete(MoviePerson).where(
            MoviePerson.movie_id == movie_id,
            MoviePerson.person_id == person_id,
            MoviePerson.role == role,
        )
    else:
        stmt = delete(MoviePerson).where(
            MoviePerson.movie_id == movie_id,
            MoviePerson.person_id == person_id,
        )

    result = db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(
            status_code=404,
            detail="Association not found between this movie and person.",
        )
    db.commit()


@router.post(
    "/{movie_id}/upload-image",
    response_model=MovieResponse,
    summary="Upload movie image",
    description="Upload an image for a movie. Supports common image formats (JPEG, PNG, GIF, WebP).",
    responses={
        200: {"description": "Image uploaded successfully, movie updated with image path."},
        400: {"description": "Invalid file type or file too large."},
        404: {"description": "Movie not found."},
    },
)
async def upload_movie_image(
    movie_id: int,
    file: UploadFile = File(..., description="Image file to upload"),
    db: Session = Depends(get_db),
) -> Movie:
    """Upload an image for a movie."""
    movie = _get_movie(movie_id, db)

    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}",
        )

    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Seek back to start

    if file_size > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {max_size // (1024 * 1024)}MB",
        )

    # Delete old image if exists
    storage = get_storage()
    if movie.image_path:
        await storage.delete(movie.image_path)

    # Save new image
    try:
        image_path = await storage.save(file.file, file.filename or "image.jpg", file.content_type)
        movie.image_path = image_path
        db.commit()
        db.refresh(movie)
        return movie
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload image: {str(e)}",
        ) from e


@router.get(
    "/{movie_id}/reviews",
    response_model=ReviewListResponse,
    summary="Get movie reviews",
    description="Returns paginated reviews for a specific movie along with the average rating.",
    responses={
        200: {"description": "List of reviews returned successfully."},
        404: {"description": "Movie not found."},
    },
)
def get_movie_reviews(
    movie_id: int,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip (for paging)."),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return (1–100)."
    ),
) -> ReviewListResponse:
    """Get all reviews for a movie with pagination."""
    _get_movie(movie_id, db)

    # Get total count and average rating
    total = db.query(Review).filter(Review.movie_id == movie_id).count()
    avg_rating = db.query(func.avg(Review.rating)).filter(Review.movie_id == movie_id).scalar()

    # Get paginated reviews
    reviews = (
        db.execute(
            select(Review)
            .where(Review.movie_id == movie_id)
            .order_by(Review.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    return ReviewListResponse(
        items=reviews,
        total=total,
        skip=skip,
        limit=limit,
        average_rating=round(float(avg_rating), 1) if avg_rating else None,
    )


@router.post(
    "/{movie_id}/reviews",
    response_model=ReviewResponse,
    status_code=201,
    summary="Create movie review",
    description="Add a new review for a movie.",
    responses={
        201: {"description": "Review created successfully."},
        404: {"description": "Movie not found."},
    },
)
def create_movie_review(
    movie_id: int,
    payload: ReviewCreate,
    db: Session = Depends(get_db),
) -> Review:
    """Create a new review for a movie."""
    _get_movie(movie_id, db)

    review = Review(
        movie_id=movie_id,
        author_name=payload.author_name,
        rating=payload.rating,
        content=payload.content,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.delete(
    "/{movie_id}/reviews/{review_id}",
    status_code=204,
    summary="Delete movie review",
    description="Delete a specific review from a movie.",
    responses={
        204: {"description": "Review deleted successfully."},
        404: {"description": "Movie or review not found."},
    },
)
def delete_movie_review(
    movie_id: int,
    review_id: int,
    db: Session = Depends(get_db),
) -> None:
    """Delete a review."""
    _get_movie(movie_id, db)

    review = db.get(Review, review_id)
    if review is None or review.movie_id != movie_id:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(review)
    db.commit()
