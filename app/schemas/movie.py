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

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "title": "Inception",
                    "description": "A thief who steals corporate secrets through dream-sharing.",
                    "release_date": "2010-07-16",
                    "genre": 5,
                    "rating": 8.8,
                },
                {"title": "Minimal Movie", "genre": 2},
            ]
        }
    )


class MovieBulkCreate(BaseModel):
    movies: list[MovieCreate] = Field(max_length=BULK_UPLOAD_LIMIT)

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "movies": [
                        {"title": "Movie One", "genre": 1},
                        {"title": "Movie Two", "genre": 2, "rating": 7.5},
                    ]
                }
            ]
        }
    )


class MovieUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    release_date: date | None = None
    genre: Genre | None = None
    rating: float | None = None

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"title": "Updated Title", "rating": 9.0}]}
    )


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
