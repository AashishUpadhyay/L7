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


@router.get("", response_model=PersonListResponse)
def list_persons(
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
) -> PersonListResponse:
    """List persons with paging."""
    total = db.query(Person).count()
    items = (
        db.execute(select(Person).offset(skip).limit(limit).order_by(Person.id))
        .scalars()
        .all()
    )
    return PersonListResponse(items=items, total=total, skip=skip, limit=limit)


@router.get("/{person_id}", response_model=PersonResponse)
def get_person(person_id: int, db: Session = Depends(get_db)) -> Person:
    """Get a single person by id."""
    return _get_person(person_id, db)


@router.post("", response_model=PersonResponse, status_code=201)
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


@router.patch("/{person_id}", response_model=PersonResponse)
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


@router.delete("/{person_id}", status_code=204)
def delete_person(person_id: int, db: Session = Depends(get_db)) -> None:
    """Delete a person."""
    person = _get_person(person_id, db)
    db.delete(person)
    db.commit()
