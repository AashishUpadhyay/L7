from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.genre import Genre

BULK_UPLOAD_LIMIT = 300


class MovieCreate(BaseModel):
    title: str
    description: str | None = None
    release_date: date | None = None
    genre: Genre
    rating: float | None = None


class MovieBulkCreate(BaseModel):
    movies: list[MovieCreate] = Field(max_length=BULK_UPLOAD_LIMIT)


class MovieUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    release_date: date | None = None
    genre: Genre | None = None
    rating: float | None = None


class MovieResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    release_date: date | None
    genre: Genre
    rating: float | None
    created_at: datetime
    updated_at: datetime


class MovieListResponse(BaseModel):
    items: list[MovieResponse]
    total: int
    skip: int
    limit: int
