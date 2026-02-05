from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.genre import Genre


class PersonCreate(BaseModel):
    name: str
    email: str

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"name": "Jane Doe", "email": "jane.doe@example.com"}]}
    )


class PersonUpdate(BaseModel):
    name: str | None = None
    email: str | None = None

    model_config = ConfigDict(json_schema_extra={"examples": [{"name": "Updated Name"}]})


class PersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    created_at: datetime
    updated_at: datetime


class PersonListResponse(BaseModel):
    items: list[PersonResponse]
    total: int
    skip: int
    limit: int


class PersonSearchRequest(BaseModel):
    """Search criteria for persons (any role: Actor, Director, Producer). All fields optional; omit for no filter."""

    search: str | None = None  # Substring match on name or email (case-insensitive)
    movie_ids: list[int] | None = None  # OR: persons who participated in any of these movies
    genres: list[Genre] | None = (
        None  # OR: persons who participated in movies with any of these genres
    )
    skip: int = Field(0, ge=0, description="Number of records to skip (for paging).")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of records to return (1–100).")
