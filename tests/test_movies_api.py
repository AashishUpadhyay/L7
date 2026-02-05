"""Integration tests for Movies API (run against live API in Docker)."""

import pytest
import httpx


class TestMoviesApi:
    @pytest.mark.parametrize("payload,expected_genre_value", [
        (
            {
                "title": "Inception",
                "description": "A thief who steals corporate secrets through dream-sharing technology.",
                "release_date": "2010-07-16",
                "genre": 5,  # SciFi
                "rating": 8.8,
            },
            5,
        ),
        (
            {"title": "Minimal Movie", "genre": 2},  # Comedy
            2,
        ),
    ])
    def test_create_movie_returns_201_and_body(
        self, base_url: str, payload: dict, expected_genre_value: int
    ) -> None:
        """POST /movies creates a movie and returns 201 with the created resource."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(f"{base_url}/movies", json=payload)

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert isinstance(data["id"], int)
        assert data["title"] == payload["title"]
        assert data["genre"] == expected_genre_value  # API returns enum value
        assert "created_at" in data
        assert "updated_at" in data

        if "description" in payload:
            assert data["description"] == payload["description"]
        if "release_date" in payload:
            assert data["release_date"] == payload["release_date"]
        if "rating" in payload:
            assert data["rating"] == payload["rating"]

    def test_create_movie_invalid_genre_returns_422(self, base_url: str) -> None:
        """POST /movies with invalid genre returns 422."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/movies",
                json={"title": "Bad", "genre": 99},  # invalid enum value
            )
        assert response.status_code == 422

    def test_create_movie_missing_title_returns_422(self, base_url: str) -> None:
        """POST /movies without title returns 422."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/movies",
                json={"genre": 3},  # Drama
            )
        assert response.status_code == 422
