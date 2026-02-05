from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.person import Person
from app.db.session import get_db
from app.schemas.person import (
    PersonCreate,
    PersonListResponse,
    PersonResponse,
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
    description="Returns a paginated list of all persons. Use `skip` and `limit` for paging.",
    responses={
        200: {"description": "Paginated list of persons returned successfully."},
    },
)
def list_persons(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0, description="Number of records to skip (for paging)."),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return (1–100)."),
) -> PersonListResponse:
    """List persons with paging."""
    total = db.query(Person).count()
    items = (
        db.execute(select(Person).offset(skip).limit(limit).order_by(Person.id))
        .scalars()
        .all()
    )
    return PersonListResponse(items=items, total=total, skip=skip, limit=limit)


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
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A person with this email already exists.",
        )
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
