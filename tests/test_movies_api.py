"""Integration tests for Movies API (run against live API in Docker)."""

import uuid

import httpx
import pytest


def _unique_email(prefix: str = "test") -> str:
    """Return a unique email for tests to avoid duplicate-key errors across runs."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}@add-to-movie.test"


class TestMoviesApi:
    @pytest.mark.parametrize(
        "payload,expected_genre_value",
        [
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
        ],
    )
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

    def test_get_movie_returns_200_and_body(self, base_url: str) -> None:
        """GET /movies/{id} returns 200 and the movie when it exists."""
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Read Me", "genre": 1},
            )
            assert create_resp.status_code == 201
            movie_id = create_resp.json()["id"]

            response = client.get(f"{base_url}/movies/{movie_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == movie_id
        assert data["title"] == "Read Me"
        assert data["genre"] == 1
        assert "created_at" in data
        assert "updated_at" in data

    def test_get_movie_not_found_returns_404(self, base_url: str) -> None:
        """GET /movies/{id} returns 404 when the movie does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{base_url}/movies/999999")
        assert response.status_code == 404

    def test_update_movie_returns_200_and_updated_body(self, base_url: str) -> None:
        """PATCH /movies/{id} returns 200 and the updated movie."""
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Original", "genre": 1, "rating": 7.0},
            )
            assert create_resp.status_code == 201
            movie_id = create_resp.json()["id"]

            response = client.patch(
                f"{base_url}/movies/{movie_id}",
                json={"title": "Updated Title", "rating": 9.0},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == movie_id
        assert data["title"] == "Updated Title"
        assert data["genre"] == 1  # unchanged
        assert data["rating"] == 9.0

    def test_update_movie_not_found_returns_404(self, base_url: str) -> None:
        """PATCH /movies/{id} returns 404 when the movie does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.patch(
                f"{base_url}/movies/999999",
                json={"title": "Noop"},
            )
        assert response.status_code == 404

    def test_delete_movie_returns_204(self, base_url: str) -> None:
        """DELETE /movies/{id} returns 204 and the movie is removed."""
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/movies",
                json={"title": "To Delete", "genre": 2},
            )
            assert create_resp.status_code == 201
            movie_id = create_resp.json()["id"]

            response = client.delete(f"{base_url}/movies/{movie_id}")

        assert response.status_code == 204
        with httpx.Client(timeout=10.0) as client:
            get_resp = client.get(f"{base_url}/movies/{movie_id}")
        assert get_resp.status_code == 404

    def test_delete_movie_not_found_returns_404(self, base_url: str) -> None:
        """DELETE /movies/{id} returns 404 when the movie does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.delete(f"{base_url}/movies/999999")
        assert response.status_code == 404

    def test_bulk_upload_movies_returns_201_and_body(self, base_url: str) -> None:
        """POST /movies/bulk creates multiple movies and returns 201 with created resources."""
        payload = {
            "movies": [
                {"title": "Bulk One", "genre": 1},
                {"title": "Bulk Two", "genre": 2, "rating": 7.5},
            ]
        }
        with httpx.Client(timeout=10.0) as client:
            response = client.post(f"{base_url}/movies/bulk", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Bulk One"
        assert data[0]["genre"] == 1
        assert "id" in data[0]
        assert data[1]["title"] == "Bulk Two"
        assert data[1]["rating"] == 7.5

    def test_bulk_upload_over_limit_returns_422(self, base_url: str) -> None:
        """POST /movies/bulk with more than 300 movies returns 422."""
        payload = {"movies": [{"title": f"Movie {i}", "genre": 1} for i in range(301)]}
        with httpx.Client(timeout=10.0) as client:
            response = client.post(f"{base_url}/movies/bulk", json=payload)

        assert response.status_code == 422

    def test_list_movies_returns_paged_response(self, base_url: str) -> None:
        """GET /movies returns paged list with items, total, skip, limit."""
        with httpx.Client(timeout=10.0) as client:
            # Create a few movies via bulk
            client.post(
                f"{base_url}/movies/bulk",
                json={
                    "movies": [
                        {"title": "Page A", "genre": 1},
                        {"title": "Page B", "genre": 2},
                        {"title": "Page C", "genre": 3},
                    ]
                },
            )

            response = client.get(f"{base_url}/movies?skip=0&limit=2")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["skip"] == 0
        assert data["limit"] == 2
        assert len(data["items"]) <= 2
        assert data["total"] >= 3
        for item in data["items"]:
            assert "id" in item
            assert "title" in item
            assert "genre" in item

    def test_add_person_to_movie_returns_201_and_body(self, base_url: str) -> None:
        """POST /movies/{id}/persons adds a person in a role and returns 201."""
        with httpx.Client(timeout=10.0) as client:
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Test Actor", "email": _unique_email("actor")},
            )
            assert person_resp.status_code == 201
            person_id = person_resp.json()["id"]

            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie With Cast", "genre": 1},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            response = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json={"person_id": person_id, "role": "Actor"},
            )

        assert response.status_code == 201
        data = response.json()
        assert data["movie_id"] == movie_id
        assert data["person_id"] == person_id
        assert data["role"] == "Actor"
        assert "id" in data

    def test_add_person_to_movie_same_person_different_roles(self, base_url: str) -> None:
        """Same person can be added in different roles (Actor, Director)."""
        with httpx.Client(timeout=10.0) as client:
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Multi Role", "email": _unique_email("multirole")},
            )
            assert person_resp.status_code == 201
            person_id = person_resp.json()["id"]

            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Multi Role Movie", "genre": 2},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            r1 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json={"person_id": person_id, "role": "Actor"},
            )
            r2 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json={"person_id": person_id, "role": "Director"},
            )

        assert r1.status_code == 201
        assert r2.status_code == 201
        assert r1.json()["role"] == "Actor"
        assert r2.json()["role"] == "Director"

    def test_add_person_to_movie_movie_not_found_returns_404(self, base_url: str) -> None:
        """POST /movies/{id}/persons returns 404 when movie does not exist."""
        with httpx.Client(timeout=10.0) as client:
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Orphan", "email": _unique_email("orphan")},
            )
            assert person_resp.status_code == 201
            person_id = person_resp.json()["id"]

            response = client.post(
                f"{base_url}/movies/999999/persons",
                json={"person_id": person_id, "role": "Actor"},
            )
        assert response.status_code == 404

    def test_add_person_to_movie_person_not_found_returns_404(self, base_url: str) -> None:
        """POST /movies/{id}/persons returns 404 when person does not exist."""
        with httpx.Client(timeout=10.0) as client:
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "No Cast Movie", "genre": 1},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            response = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json={"person_id": 999999, "role": "Actor"},
            )
        assert response.status_code == 404

    def test_add_person_to_movie_duplicate_returns_409(self, base_url: str) -> None:
        """Adding same person in same role again returns 409."""
        with httpx.Client(timeout=10.0) as client:
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Dup", "email": _unique_email("dup")},
            )
            assert person_resp.status_code == 201
            person_id = person_resp.json()["id"]

            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Dup Movie", "genre": 1},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            r1 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json={"person_id": person_id, "role": "Producer"},
            )
            r2 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json={"person_id": person_id, "role": "Producer"},
            )
        assert r1.status_code == 201
        assert r2.status_code == 409
