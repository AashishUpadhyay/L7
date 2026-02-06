from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.movie_genre import MovieGenre
from app.db.models.movie_person import MoviePerson
from app.db.models.movies import Movie
from app.db.models.person import Person
from app.db.session import get_db
from app.schemas.movie_person import MovieInPersonResponse
from app.schemas.person import (
    PersonCreate,
    PersonListResponse,
    PersonResponse,
    PersonSearchRequest,
    PersonUpdate,
)

router = APIRouter(prefix="/persons", tags=["persons"])


def _get_person(person_id: int, db: Session) -> Person:
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.get(
    "",
    response_model=PersonListResponse,
    summary="List persons",
    description="Returns a paginated list of all persons with movie count. Use `skip` and `limit` for paging. For search by movie_ids or genres (any role), use POST /persons/search.",
    responses={
        200: {"description": "Paginated list of persons returned successfully."},
    },
)
def list_persons(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip (for paging)."),
    limit: int = Query(
        20, ge=1, le=100, description="Maximum number of records to return (1–100)."
    ),
) -> PersonListResponse:
    """List persons with paging and movie count."""
    total = db.query(Person).count()

    # Get persons with movie count
    stmt = (
        select(Person, func.count(MoviePerson.id).label("movie_count"))
        .outerjoin(MoviePerson, MoviePerson.person_id == Person.id)
        .group_by(Person.id)
        .order_by(Person.id)
        .offset(skip)
        .limit(limit)
    )
    results = db.execute(stmt).all()

    # Build response with movie_count
    items = []
    for person, movie_count in results:
        person_dict = {
            "id": person.id,
            "name": person.name,
            "email": person.email,
            "created_at": person.created_at,
            "updated_at": person.updated_at,
            "movie_count": movie_count,
        }
        items.append(PersonResponse(**person_dict))

    return PersonListResponse(items=items, total=total, skip=skip, limit=limit)


def _person_name_email_filter(q: str):
    """Case-insensitive substring match on name or email."""
    pattern = f"%{q}%"
    return or_(Person.name.ilike(pattern), Person.email.ilike(pattern))


@router.post(
    "/search",
    response_model=PersonListResponse,
    summary="Search persons",
    description="Search persons by search (name/email), movie_ids (OR), genres (OR), or roles (OR). Request body supports optional filters and paging (skip, limit). Includes movie count.",
    responses={
        200: {"description": "Paginated search results returned successfully."},
    },
)
def search_persons(
    payload: PersonSearchRequest,
    db: Session = Depends(get_db),
) -> PersonListResponse:
    """Search persons with optional filters and paging (all roles). movie_ids, genres, and roles use OR. Includes movie count."""
    search_q = payload.search.strip() if payload.search else ""
    name_filter = _person_name_email_filter(search_q) if search_q else None

    if payload.movie_ids or payload.genres or payload.roles:
        base = select(Person).join(MoviePerson, MoviePerson.person_id == Person.id)
        if payload.movie_ids:
            base = base.where(MoviePerson.movie_id.in_(payload.movie_ids))
        if payload.genres:
            base = (
                base.join(Movie, Movie.id == MoviePerson.movie_id)
                .join(MovieGenre, MovieGenre.movie_id == Movie.id)
                .where(MovieGenre.genre.in_(payload.genres))
                .distinct()
            )
        if payload.roles:
            base = base.where(MoviePerson.role.in_(payload.roles))
        if name_filter is not None:
            base = base.where(name_filter)
        total = db.execute(
            select(func.count()).select_from(base.distinct().subquery())
        ).scalar_one()
        ids_stmt = select(Person.id).join(MoviePerson, MoviePerson.person_id == Person.id)
        if payload.movie_ids:
            ids_stmt = ids_stmt.where(MoviePerson.movie_id.in_(payload.movie_ids))
        if payload.genres:
            ids_stmt = (
                ids_stmt.join(Movie, Movie.id == MoviePerson.movie_id)
                .join(MovieGenre, MovieGenre.movie_id == Movie.id)
                .where(MovieGenre.genre.in_(payload.genres))
                .distinct()
            )
        if payload.roles:
            ids_stmt = ids_stmt.where(MoviePerson.role.in_(payload.roles))
        if name_filter is not None:
            ids_stmt = ids_stmt.where(name_filter)
        ids_stmt = ids_stmt.distinct().order_by(Person.id).offset(payload.skip).limit(payload.limit)
        ids = [row[0] for row in db.execute(ids_stmt).all()]
        if not ids:
            items = []
        else:
            # Get persons with movie count
            stmt = (
                select(Person, func.count(MoviePerson.id).label("movie_count"))
                .outerjoin(MoviePerson, MoviePerson.person_id == Person.id)
                .where(Person.id.in_(ids))
                .group_by(Person.id)
                .order_by(Person.id)
            )
            results = db.execute(stmt).all()
            items = []
            for person, movie_count in results:
                person_dict = {
                    "id": person.id,
                    "name": person.name,
                    "email": person.email,
                    "created_at": person.created_at,
                    "updated_at": person.updated_at,
                    "movie_count": movie_count,
                }
                items.append(PersonResponse(**person_dict))
        return PersonListResponse(items=items, total=total, skip=payload.skip, limit=payload.limit)

    if name_filter is not None:
        base = select(Person).where(name_filter)
        total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()

        # Get persons with movie count
        stmt = (
            select(Person, func.count(MoviePerson.id).label("movie_count"))
            .outerjoin(MoviePerson, MoviePerson.person_id == Person.id)
            .where(name_filter)
            .group_by(Person.id)
            .order_by(Person.id)
            .offset(payload.skip)
            .limit(payload.limit)
        )
        results = db.execute(stmt).all()
        items = []
        for person, movie_count in results:
            person_dict = {
                "id": person.id,
                "name": person.name,
                "email": person.email,
                "created_at": person.created_at,
                "updated_at": person.updated_at,
                "movie_count": movie_count,
            }
            items.append(PersonResponse(**person_dict))
        return PersonListResponse(items=items, total=total, skip=payload.skip, limit=payload.limit)

    total = db.query(Person).count()

    # Get persons with movie count
    stmt = (
        select(Person, func.count(MoviePerson.id).label("movie_count"))
        .outerjoin(MoviePerson, MoviePerson.person_id == Person.id)
        .group_by(Person.id)
        .order_by(Person.id)
        .offset(payload.skip)
        .limit(payload.limit)
    )
    results = db.execute(stmt).all()
    items = []
    for person, movie_count in results:
        person_dict = {
            "id": person.id,
            "name": person.name,
            "email": person.email,
            "created_at": person.created_at,
            "updated_at": person.updated_at,
            "movie_count": movie_count,
        }
        items.append(PersonResponse(**person_dict))

    return PersonListResponse(items=items, total=total, skip=payload.skip, limit=payload.limit)


@router.get(
    "/{person_id}",
    response_model=PersonResponse,
    summary="Get person by ID",
    description="Returns a single person by their unique identifier.",
    responses={
        200: {"description": "Person found and returned."},
        404: {"description": "Person not found."},
    },
)
def get_person(person_id: int, db: Session = Depends(get_db)) -> Person:
    """Get a single person by id."""
    return _get_person(person_id, db)


@router.get(
    "/{person_id}/movies",
    response_model=list[MovieInPersonResponse],
    summary="Get movies for person",
    description="Returns all movies associated with a person along with their roles.",
    responses={
        200: {"description": "List of movies for person returned successfully."},
        404: {"description": "Person not found."},
    },
)
def get_person_movies(person_id: int, db: Session = Depends(get_db)) -> list[MovieInPersonResponse]:
    """Get all movies associated with a person."""
    from app.db.models.movie_genre import MovieGenre

    _get_person(person_id, db)
    stmt = (
        select(MoviePerson, Movie)
        .join(Movie, MoviePerson.movie_id == Movie.id)
        .where(MoviePerson.person_id == person_id)
        .order_by(MoviePerson.role, Movie.title)
    )
    results = db.execute(stmt).all()

    # Fetch genres for each movie
    movie_ids = [movie.id for _, movie in results]
    genre_stmt = select(MovieGenre).where(MovieGenre.movie_id.in_(movie_ids))
    genre_results = db.execute(genre_stmt).scalars().all()

    # Group genres by movie_id
    genres_by_movie: dict[int, list[int]] = {}
    for mg in genre_results:
        if mg.movie_id not in genres_by_movie:
            genres_by_movie[mg.movie_id] = []
        genres_by_movie[mg.movie_id].append(mg.genre)

    return [
        MovieInPersonResponse(
            id=mp.id,
            movie_id=mp.movie_id,
            movie_title=movie.title,
            role=mp.role,
            image_path=movie.image_path,
            rating=movie.rating,
            release_date=movie.release_date.isoformat() if movie.release_date else None,
            genres=genres_by_movie.get(movie.id, []),
        )
        for mp, movie in results
    ]


@router.post(
    "",
    response_model=PersonResponse,
    status_code=201,
    summary="Create person",
    description="Creates a new person with the given name and email. Email must be unique.",
    responses={
        201: {"description": "Person created successfully."},
        409: {"description": "A person with this email already exists."},
    },
)
def create_person(payload: PersonCreate, db: Session = Depends(get_db)) -> Person:
    person = Person(name=payload.name, email=payload.email)
    db.add(person)
    try:
        db.commit()
        db.refresh(person)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A person with this email already exists.",
        ) from e
    return person


@router.patch(
    "/{person_id}",
    response_model=PersonResponse,
    summary="Update person",
    description="Partially updates a person. Only provided fields are updated.",
    responses={
        200: {"description": "Person updated successfully."},
        404: {"description": "Person not found."},
    },
)
def update_person(
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
) -> Person:
    """Update a person (partial update)."""
    person = _get_person(person_id, db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(person, key, value)
    db.commit()
    db.refresh(person)
    return person


@router.delete(
    "/{person_id}",
    status_code=204,
    summary="Delete person",
    description="Deletes a person by ID. Returns no content on success.",
    responses={
        204: {"description": "Person deleted successfully."},
        404: {"description": "Person not found."},
    },
)
def delete_person(person_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a person."""
    person = _get_person(person_id, db)
    db.delete(person)
    db.commit()
