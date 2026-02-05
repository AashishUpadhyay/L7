from pydantic import BaseModel, ConfigDict

from app.db.models.role import MovieRole


class AddPersonToMovieRequest(BaseModel):
    person_id: int
    role: MovieRole


class MoviePersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    person_id: int
    role: MovieRole
