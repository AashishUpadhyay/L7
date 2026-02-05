"""Integration tests for Movies API (run against live API in Docker)."""

import uuid

import httpx
import pytest


def _unique_email(prefix: str = "test") -> str:
    """Return a unique email for tests to avoid duplicate-key errors across runs."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}@add-to-movie.test"


class TestMoviesApi:
    @pytest.mark.parametrize(
        "payload,expected_genres",
        [
            (
                {
                    "title": "Inception",
                    "description": "A thief who steals corporate secrets through dream-sharing technology.",
                    "release_date": "2010-07-16",
                    "genres": [5],  # SciFi
                    "rating": 8.8,
                },
                [5],
            ),
            (
                {"title": "Minimal Movie", "genres": [2]},  # Comedy
                [2],
            ),
            (
                {"title": "SciFi Thriller", "genres": [5, 6], "rating": 7.5},  # SciFi, Thriller
                [5, 6],
            ),
        ],
    )
    def test_create_movie_returns_201_and_body(
        self, base_url: str, payload: dict, expected_genres: list
    ) -> None:
        """POST /movies creates a movie and returns 201 with the created resource."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(f"{base_url}/movies", json=payload)

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert isinstance(data["id"], int)
        assert data["title"] == payload["title"]
        assert data["genres"] == expected_genres  # API returns list of enum values
        assert "created_at" in data
        assert "updated_at" in data

        if "description" in payload:
            assert data["description"] == payload["description"]
        if "release_date" in payload:
            assert data["release_date"] == payload["release_date"]
        if "rating" in payload:
            assert data["rating"] == payload["rating"]

    def test_create_movie_with_multiple_genres_returns_all_in_response(self, base_url: str) -> None:
        """POST /movies with multiple genres returns 201 and response includes all genres (sorted)."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/movies",
                json={"title": "Action SciFi Thriller", "genres": [1, 5, 6], "rating": 8.0},
            )
            assert response.status_code == 201
            data = response.json()
            assert data["genres"] == [1, 5, 6]
            # GET returns same genres
            movie_id = data["id"]
            get_resp = client.get(f"{base_url}/movies/{movie_id}")
            assert get_resp.status_code == 200
            assert get_resp.json()["genres"] == [1, 5, 6]

    def test_create_movie_invalid_genre_returns_422(self, base_url: str) -> None:
        """POST /movies with invalid genre returns 422."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/movies",
                json={"title": "Bad", "genres": [99]},  # invalid enum value
            )
        assert response.status_code == 422

    def test_create_movie_missing_title_returns_422(self, base_url: str) -> None:
        """POST /movies without title returns 422."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/movies",
                json={"genres": [3]},  # Drama
            )
        assert response.status_code == 422

    def test_get_movie_returns_200_and_body(self, base_url: str) -> None:
        """GET /movies/{id} returns 200 and the movie when it exists."""
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Read Me", "genres": [1]},
            )
            assert create_resp.status_code == 201
            movie_id = create_resp.json()["id"]

            response = client.get(f"{base_url}/movies/{movie_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == movie_id
        assert data["title"] == "Read Me"
        assert data["genres"] == [1]
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
                json={"title": "Original", "genres": [1], "rating": 7.0},
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
        assert data["genres"] == [1]  # unchanged
        assert data["rating"] == 9.0

    def test_update_movie_with_multiple_genres_replaces_genres(self, base_url: str) -> None:
        """PATCH /movies/{id} with genres replaces existing genres with the new list."""
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Original", "genres": [1, 2]},
            )
            assert create_resp.status_code == 201
            movie_id = create_resp.json()["id"]
            response = client.patch(
                f"{base_url}/movies/{movie_id}",
                json={"genres": [3, 5, 6]},  # Drama, SciFi, Thriller
            )
        assert response.status_code == 200
        data = response.json()
        assert data["genres"] == [3, 5, 6]

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
                json={"title": "To Delete", "genres": [2]},
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
                {"title": "Bulk One", "genres": [1]},
                {"title": "Bulk Two", "genres": [2], "rating": 7.5},
            ]
        }
        with httpx.Client(timeout=10.0) as client:
            response = client.post(f"{base_url}/movies/bulk", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
        assert data[0]["title"] == "Bulk One"
        assert data[0]["genres"] == [1]
        assert "id" in data[0]
        assert data[1]["title"] == "Bulk Two"
        assert data[1]["rating"] == 7.5

    def test_bulk_upload_movies_with_multiple_genres(self, base_url: str) -> None:
        """POST /movies/bulk accepts movies with multiple genres per movie."""
        payload = {
            "movies": [
                {"title": "Bulk Multi One", "genres": [1, 6]},
                {"title": "Bulk Multi Two", "genres": [2, 3, 8], "rating": 6.0},
            ]
        }
        with httpx.Client(timeout=10.0) as client:
            response = client.post(f"{base_url}/movies/bulk", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
        assert data[0]["genres"] == [1, 6]
        assert data[1]["genres"] == [2, 3, 8]

    def test_bulk_upload_over_limit_returns_422(self, base_url: str) -> None:
        """POST /movies/bulk with more than 300 movies returns 422."""
        payload = {"movies": [{"title": f"Movie {i}", "genres": [1]} for i in range(301)]}
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
                        {"title": "Page A", "genres": [1]},
                        {"title": "Page B", "genres": [2]},
                        {"title": "Page C", "genres": [3]},
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
            assert "genres" in item

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
                json={"title": "Movie With Cast", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            response = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": person_id, "role": "Actor"}],
            )

        assert response.status_code == 201
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["movie_id"] == movie_id
        assert data[0]["person_id"] == person_id
        assert data[0]["role"] == "Actor"
        assert "id" in data[0]

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
                json={"title": "Multi Role Movie", "genres": [2]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            r1 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[
                    {"person_id": person_id, "role": "Actor"},
                    {"person_id": person_id, "role": "Director"},
                ],
            )

        assert r1.status_code == 201
        roles = [x["role"] for x in r1.json()]
        assert "Actor" in roles
        assert "Director" in roles

    def test_add_persons_to_movie_multiple_in_one_request(self, base_url: str) -> None:
        """POST /movies/{id}/persons accepts a list and adds all in one request."""
        with httpx.Client(timeout=10.0) as client:
            p1 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor 1", "email": _unique_email("multi1")},
            )
            p2 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor 2", "email": _unique_email("multi2")},
            )
            assert p1.status_code == 201
            assert p2.status_code == 201
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Multi Cast", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]
            response = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[
                    {"person_id": p1.json()["id"], "role": "Actor"},
                    {"person_id": p2.json()["id"], "role": "Actor"},
                ],
            )
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 2
        assert {data[0]["person_id"], data[1]["person_id"]} == {
            p1.json()["id"],
            p2.json()["id"],
        }
        assert all(x["movie_id"] == movie_id and x["role"] == "Actor" for x in data)

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
                json=[{"person_id": person_id, "role": "Actor"}],
            )
        assert response.status_code == 404

    def test_add_person_to_movie_person_not_found_returns_404(self, base_url: str) -> None:
        """POST /movies/{id}/persons returns 404 when person does not exist."""
        with httpx.Client(timeout=10.0) as client:
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "No Cast Movie", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            response = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": 999999, "role": "Actor"}],
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
                json={"title": "Dup Movie", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            r1 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": person_id, "role": "Producer"}],
            )
            r2 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": person_id, "role": "Producer"}],
            )
        assert r1.status_code == 201
        assert r2.status_code == 409

    def test_add_person_to_movie_second_director_returns_409(self, base_url: str) -> None:
        """Adding a second director to a movie returns 409; movie can have only one director."""
        with httpx.Client(timeout=10.0) as client:
            d1 = client.post(
                f"{base_url}/persons",
                json={"name": "Director One", "email": _unique_email("dir1")},
            )
            d2 = client.post(
                f"{base_url}/persons",
                json={"name": "Director Two", "email": _unique_email("dir2")},
            )
            assert d1.status_code == 201
            assert d2.status_code == 201
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "One Director Movie", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]
            r1 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": d1.json()["id"], "role": "Director"}],
            )
            r2 = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": d2.json()["id"], "role": "Director"}],
            )
        assert r1.status_code == 201
        assert r2.status_code == 409
        assert "director" in r2.json().get("detail", "").lower()

    def test_add_person_to_movie_two_directors_in_same_request_returns_409(
        self, base_url: str
    ) -> None:
        """Adding two directors in a single request returns 409."""
        with httpx.Client(timeout=10.0) as client:
            d1 = client.post(
                f"{base_url}/persons",
                json={"name": "Director A", "email": _unique_email("dirA")},
            )
            d2 = client.post(
                f"{base_url}/persons",
                json={"name": "Director B", "email": _unique_email("dirB")},
            )
            assert d1.status_code == 201
            assert d2.status_code == 201
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "No Two Directors", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]
            response = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[
                    {"person_id": d1.json()["id"], "role": "Director"},
                    {"person_id": d2.json()["id"], "role": "Director"},
                ],
            )
        assert response.status_code == 409
        assert "director" in response.json().get("detail", "").lower()

    def test_search_movies_by_genre_returns_filtered_list(self, base_url: str) -> None:
        """POST /movies/search with genres (multiple) filters and returns paged results."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/movies",
                json={"title": "SciFi One", "genres": [5]},
            )
            client.post(
                f"{base_url}/movies",
                json={"title": "Comedy One", "genres": [2]},
            )
            client.post(
                f"{base_url}/movies",
                json={"title": "Thriller One", "genres": [6]},
            )
            response = client.post(
                f"{base_url}/movies/search",
                json={"genres": [5, 6], "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["skip"] == 0
        assert data["limit"] == 10
        genre_values = {g for item in data["items"] for g in item["genres"]}
        assert 5 in genre_values or 6 in genre_values
        assert data["total"] >= 1

    def test_search_movies_by_genre_finds_movies_with_multiple_genres(self, base_url: str) -> None:
        """POST /movies/search with genres returns movies that have any of those genres."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/movies",
                json={"title": "SciFi And Thriller", "genres": [5, 6]},
            )
            response = client.post(
                f"{base_url}/movies/search",
                json={"genres": [5, 6], "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        assert any(m["title"] == "SciFi And Thriller" and 6 in m["genres"] for m in data["items"])

    def test_search_movies_by_multiple_genres_or_returns_any_match(self, base_url: str) -> None:
        """POST /movies/search with genres (list) returns movies that have any of those genres."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/movies",
                json={"title": "SciFi Only", "genres": [5]},
            )
            client.post(
                f"{base_url}/movies",
                json={"title": "Comedy Only", "genres": [2]},
            )
            client.post(
                f"{base_url}/movies",
                json={"title": "Drama Only", "genres": [3]},
            )
            response = client.post(
                f"{base_url}/movies/search",
                json={"genres": [5, 3], "skip": 0, "limit": 20},
            )
        assert response.status_code == 200
        data = response.json()
        titles = [m["title"] for m in data["items"]]
        assert "SciFi Only" in titles
        assert "Drama Only" in titles
        assert "Comedy Only" not in titles

    def test_search_movies_by_release_year_returns_filtered_list(self, base_url: str) -> None:
        """POST /movies/search with release_year filters and returns paged results."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/movies",
                json={"title": "Year 2020", "genres": [1], "release_date": "2020-06-15"},
            )
            client.post(
                f"{base_url}/movies",
                json={"title": "Year 2021", "genres": [2], "release_date": "2021-01-01"},
            )
            response = client.post(
                f"{base_url}/movies/search",
                json={"release_year": 2020, "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        assert all((item.get("release_date") or "").startswith("2020") for item in data["items"])
        assert data["total"] >= 1

    def test_search_movies_by_director_returns_filtered_list(self, base_url: str) -> None:
        """POST /movies/search with director_id returns movies directed by that person."""
        with httpx.Client(timeout=10.0) as client:
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Director X", "email": _unique_email("director")},
            )
            assert person_resp.status_code == 201
            director_id = person_resp.json()["id"]
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Directed by X", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]
            client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": director_id, "role": "Director"}],
            )
            response = client.post(
                f"{base_url}/movies/search",
                json={"director_id": director_id, "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        ids = [m["id"] for m in data["items"]]
        assert movie_id in ids

    def test_search_movies_by_actor_returns_filtered_list(self, base_url: str) -> None:
        """POST /movies/search with actor_ids (multiple) returns movies featuring any of those actors."""
        with httpx.Client(timeout=10.0) as client:
            p1 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor Y", "email": _unique_email("actor-search")},
            )
            p2 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor Z", "email": _unique_email("actor-search-z")},
            )
            assert p1.status_code == 201
            assert p2.status_code == 201
            actor_id_y, actor_id_z = p1.json()["id"], p2.json()["id"]
            m1 = client.post(
                f"{base_url}/movies",
                json={"title": "Starring Y", "genres": [2]},
            )
            m2 = client.post(
                f"{base_url}/movies",
                json={"title": "Starring Z", "genres": [3]},
            )
            assert m1.status_code == 201
            assert m2.status_code == 201
            movie_id_y, movie_id_z = m1.json()["id"], m2.json()["id"]
            client.post(
                f"{base_url}/movies/{movie_id_y}/persons",
                json=[{"person_id": actor_id_y, "role": "Actor"}],
            )
            client.post(
                f"{base_url}/movies/{movie_id_z}/persons",
                json=[{"person_id": actor_id_z, "role": "Actor"}],
            )
            response = client.post(
                f"{base_url}/movies/search",
                json={"actor_ids": [actor_id_y, actor_id_z], "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        ids = [m["id"] for m in data["items"]]
        assert movie_id_y in ids
        assert movie_id_z in ids

    def test_search_movies_by_multiple_actor_ids_or_returns_any_match(self, base_url: str) -> None:
        """POST /movies/search with actor_ids (list) returns movies featuring any of those actors."""
        with httpx.Client(timeout=10.0) as client:
            a1 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor One", "email": _unique_email("a1")},
            )
            a2 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor Two", "email": _unique_email("a2")},
            )
            assert a1.status_code == 201
            assert a2.status_code == 201
            id1, id2 = a1.json()["id"], a2.json()["id"]
            m1 = client.post(
                f"{base_url}/movies",
                json={"title": "Movie A", "genres": [1]},
            )
            m2 = client.post(
                f"{base_url}/movies",
                json={"title": "Movie B", "genres": [1]},
            )
            assert m1.status_code == 201
            assert m2.status_code == 201
            mid1, mid2 = m1.json()["id"], m2.json()["id"]
            client.post(
                f"{base_url}/movies/{mid1}/persons",
                json=[{"person_id": id1, "role": "Actor"}],
            )
            client.post(
                f"{base_url}/movies/{mid2}/persons",
                json=[{"person_id": id2, "role": "Actor"}],
            )
            response = client.post(
                f"{base_url}/movies/search",
                json={"actor_ids": [id1, id2], "skip": 0, "limit": 20},
            )
        assert response.status_code == 200
        data = response.json()
        ids = [m["id"] for m in data["items"]]
        assert mid1 in ids
        assert mid2 in ids

    def test_search_movies_paging_respected(self, base_url: str) -> None:
        """POST /movies/search with skip/limit returns correct page."""
        with httpx.Client(timeout=10.0) as client:
            for i in range(3):
                client.post(
                    f"{base_url}/movies",
                    json={"title": f"Comedy Page {i}", "genres": [2]},
                )
            for i in range(2):
                client.post(
                    f"{base_url}/movies",
                    json={"title": f"Drama Page {i}", "genres": [3]},
                )
            r1 = client.post(
                f"{base_url}/movies/search",
                json={"genres": [2, 3], "skip": 0, "limit": 2},
            )
            r2 = client.post(
                f"{base_url}/movies/search",
                json={"genres": [2, 3], "skip": 2, "limit": 2},
            )
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert len(r1.json()["items"]) <= 2
        assert len(r2.json()["items"]) <= 2
        assert r1.json()["skip"] == 0
        assert r2.json()["skip"] == 2
        assert r1.json()["limit"] == 2
        assert r2.json()["limit"] == 2
