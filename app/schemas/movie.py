from datetime import date, datetime

from pydantic import BaseModel, ConfigDict

from app.db.models.genre import Genre


class MovieCreate(BaseModel):
    title: str
    description: str | None = None
    release_date: date | None = None
    genre: Genre
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
