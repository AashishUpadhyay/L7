from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    """Schema for creating a review."""

    author_name: str = Field(..., min_length=1, max_length=255)
    rating: float = Field(..., ge=0, le=10, description="Rating from 0-10")
    content: str = Field(..., min_length=1, description="Review content")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "author_name": "John Doe",
                    "rating": 8.5,
                    "content": "Great movie! The acting was superb and the story kept me engaged throughout.",
                }
            ]
        }
    )


class ReviewResponse(BaseModel):
    """Schema for review response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    movie_id: int
    author_name: str
    rating: float
    content: str
    created_at: datetime


class ReviewListResponse(BaseModel):
    """Schema for paginated review list."""

    items: list[ReviewResponse]
    total: int
    skip: int
    limit: int
    average_rating: float | None = Field(
        None, description="Average rating across all reviews for this movie"
    )
