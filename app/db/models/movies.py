import datetime

from app.db.models.genre import Genre


class Movie:
    id: int
    title: str
    description: str
    release_date: datetime
    genre: Genre
    rating: float
    created_at: datetime
    updated_at: datetime
