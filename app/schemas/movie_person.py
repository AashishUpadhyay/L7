from pydantic import BaseModel, ConfigDict

from app.db.models.role import MovieRole


class AddPersonToMovieRequest(BaseModel):
    person_id: int
    role: MovieRole

    model_config = ConfigDict(json_schema_extra={"examples": [{"person_id": 1, "role": "Actor"}]})


class MoviePersonResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    person_id: int
    role: MovieRole


class PersonInMovieResponse(BaseModel):
    """Response model that includes person details along with the relationship."""

    model_config = ConfigDict(from_attributes=True)

    id: int  # movie_person id
    person_id: int
    person_name: str
    person_email: str
    role: MovieRole


class MovieInPersonResponse(BaseModel):
    """Response model that includes movie details along with the relationship."""

    model_config = ConfigDict(from_attributes=True)

    id: int  # movie_person id
    movie_id: int
    movie_title: str
    role: MovieRole
