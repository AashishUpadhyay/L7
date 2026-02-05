from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.db.models.genre import Genre

BULK_UPLOAD_LIMIT = 300


class MovieCreate(BaseModel):
    title: str
    description: str | None = None
    release_date: date | None = None
    genres: list[Genre] = Field(..., min_length=1, description="At least one genre required.")
    rating: float | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "title": "Inception",
                    "description": "A thief who steals corporate secrets through dream-sharing.",
                    "release_date": "2010-07-16",
                    "genres": [5, 6],
                    "rating": 8.8,
                },
                {"title": "Minimal Movie", "genres": [2]},
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
                        {"title": "Movie One", "genres": [1]},
                        {"title": "Movie Two", "genres": [2], "rating": 7.5},
                    ]
                }
            ]
        }
    )


class MovieUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    release_date: date | None = None
    genres: list[Genre] | None = Field(None, min_length=1)
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
    genres: list[Genre]
    rating: float | None
    created_at: datetime
    updated_at: datetime


class MovieListResponse(BaseModel):
    items: list[MovieResponse]
    total: int
    skip: int
    limit: int


class MovieSearchRequest(BaseModel):
    """Search criteria for movies. All fields optional; omit for no filter."""

    title: str | None = None  # Substring match on title (case-insensitive)
    genres: list[Genre] | None = None  # OR: movies that have any of these genres
    director_id: int | None = None
    release_year: int | None = Field(None, ge=1800, le=2100)
    actor_ids: list[int] | None = None  # OR: movies that feature any of these actors
    skip: int = Field(0, ge=0, description="Number of records to skip (for paging).")
    limit: int = Field(20, ge=1, le=100, description="Maximum number of records to return (1–100).")
