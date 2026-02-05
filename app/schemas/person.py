from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
