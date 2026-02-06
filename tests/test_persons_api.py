"""Integration tests for Persons API (run against live API in Docker)."""

import uuid

import httpx


def _unique_email(prefix: str = "test") -> str:
    """Return a unique email for tests to avoid duplicate-key errors across runs."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}@persons.test"


class TestPersonsApi:
    def test_create_person_returns_201_and_body(self, base_url: str) -> None:
        """POST /persons creates a person and returns 201 with the created resource."""
        email = _unique_email("jane")
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/persons",
                json={"name": "Jane Doe", "email": email},
            )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert isinstance(data["id"], int)
        assert data["name"] == "Jane Doe"
        assert data["email"] == email
        assert "created_at" in data
        assert "updated_at" in data

    def test_create_person_missing_email_returns_422(self, base_url: str) -> None:
        """POST /persons without email returns 422."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/persons",
                json={"name": "No Email"},
            )
        assert response.status_code == 422

    def test_create_person_missing_name_returns_422(self, base_url: str) -> None:
        """POST /persons without name returns 422."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/persons",
                json={"email": _unique_email("noname")},
            )
        assert response.status_code == 422

    def test_list_persons_returns_paged_response(self, base_url: str) -> None:
        """GET /persons returns paged list with items, total, skip, limit."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/persons",
                json={"name": "List A", "email": _unique_email("lista")},
            )
            client.post(
                f"{base_url}/persons",
                json={"name": "List B", "email": _unique_email("listb")},
            )

            response = client.get(f"{base_url}/persons?skip=0&limit=2")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["skip"] == 0
        assert data["limit"] == 2
        assert len(data["items"]) <= 2
        assert data["total"] >= 2
        for item in data["items"]:
            assert "id" in item
            assert "name" in item
            assert "email" in item

    def test_get_person_returns_200_and_body(self, base_url: str) -> None:
        """GET /persons/{id} returns 200 and the person when it exists."""
        email = _unique_email("read")
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Read Me", "email": email},
            )
            assert create_resp.status_code == 201
            person_id = create_resp.json()["id"]

            response = client.get(f"{base_url}/persons/{person_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == person_id
        assert data["name"] == "Read Me"
        assert data["email"] == email
        assert "created_at" in data
        assert "updated_at" in data

    def test_get_person_not_found_returns_404(self, base_url: str) -> None:
        """GET /persons/{id} returns 404 when the person does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{base_url}/persons/999999")
        assert response.status_code == 404

    def test_update_person_returns_200_and_updated_body(self, base_url: str) -> None:
        """PATCH /persons/{id} returns 200 and the updated person."""
        email_old = _unique_email("original")
        email_new = _unique_email("updated")
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Original", "email": email_old},
            )
            assert create_resp.status_code == 201
            person_id = create_resp.json()["id"]

            response = client.patch(
                f"{base_url}/persons/{person_id}",
                json={"name": "Updated Name", "email": email_new},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == person_id
        assert data["name"] == "Updated Name"
        assert data["email"] == email_new

    def test_update_person_partial_returns_200(self, base_url: str) -> None:
        """PATCH /persons/{id} with only name updates just the name."""
        email = _unique_email("partial")
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Partial", "email": email},
            )
            assert create_resp.status_code == 201
            person_id = create_resp.json()["id"]

            response = client.patch(
                f"{base_url}/persons/{person_id}",
                json={"name": "Only Name Changed"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Only Name Changed"
        assert data["email"] == email

    def test_update_person_not_found_returns_404(self, base_url: str) -> None:
        """PATCH /persons/{id} returns 404 when the person does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.patch(
                f"{base_url}/persons/999999",
                json={"name": "Noop"},
            )
        assert response.status_code == 404

    def test_delete_person_returns_204(self, base_url: str) -> None:
        """DELETE /persons/{id} returns 204 and the person is removed."""
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/persons",
                json={"name": "To Delete", "email": _unique_email("todelete")},
            )
            assert create_resp.status_code == 201
            person_id = create_resp.json()["id"]

            response = client.delete(f"{base_url}/persons/{person_id}")

        assert response.status_code == 204
        with httpx.Client(timeout=10.0) as client:
            get_resp = client.get(f"{base_url}/persons/{person_id}")
        assert get_resp.status_code == 404

    def test_delete_person_not_found_returns_404(self, base_url: str) -> None:
        """DELETE /persons/{id} returns 404 when the person does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.delete(f"{base_url}/persons/999999")
        assert response.status_code == 404

    def test_search_persons_by_movie_returns_actors_in_that_movie(self, base_url: str) -> None:
        """POST /persons/search with movie_ids (multiple) returns persons in any of those movies."""
        with httpx.Client(timeout=10.0) as client:
            a1 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor A", "email": _unique_email("actor-a")},
            )
            a2 = client.post(
                f"{base_url}/persons",
                json={"name": "Actor B", "email": _unique_email("actor-b")},
            )
            assert a1.status_code == 201
            assert a2.status_code == 201
            actor_id_a, actor_id_b = a1.json()["id"], a2.json()["id"]
            m1 = client.post(
                f"{base_url}/movies",
                json={"title": "Movie With A", "genres": [1]},
            )
            m2 = client.post(
                f"{base_url}/movies",
                json={"title": "Movie With B", "genres": [2]},
            )
            assert m1.status_code == 201
            assert m2.status_code == 201
            movie_id_1, movie_id_2 = m1.json()["id"], m2.json()["id"]
            client.post(
                f"{base_url}/movies/{movie_id_1}/persons",
                json=[{"person_id": actor_id_a, "role": "Actor"}],
            )
            client.post(
                f"{base_url}/movies/{movie_id_2}/persons",
                json=[{"person_id": actor_id_b, "role": "Actor"}],
            )
            response = client.post(
                f"{base_url}/persons/search",
                json={"movie_ids": [movie_id_1, movie_id_2], "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        ids = [p["id"] for p in data["items"]]
        assert actor_id_a in ids
        assert actor_id_b in ids

    def test_search_persons_by_genre_returns_actors_in_that_genre(self, base_url: str) -> None:
        """POST /persons/search with genres (multiple) returns actors in movies of any of those genres."""
        unique = uuid.uuid4().hex[:8]
        with httpx.Client(timeout=10.0) as client:
            a1 = client.post(
                f"{base_url}/persons",
                json={"name": f"Drama Actor {unique}", "email": _unique_email("drama-actor")},
            )
            assert a1.status_code == 201
            actor_id = a1.json()["id"]
            m = client.post(
                f"{base_url}/movies",
                json={"title": f"Drama Movie {unique}", "genres": [3, 8]},  # Drama, Romance
            )
            assert m.status_code == 201
            movie_id = m.json()["id"]
            client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": actor_id, "role": "Actor"}],
            )
            response = client.post(
                f"{base_url}/persons/search",
                json={"genres": [3, 8], "search": unique, "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        ids = [p["id"] for p in data["items"]]
        assert actor_id in ids

    def test_search_persons_by_multiple_movie_ids_or_returns_any_match(self, base_url: str) -> None:
        """POST /persons/search with movie_ids returns persons in any of those movies."""
        unique = uuid.uuid4().hex[:8]
        with httpx.Client(timeout=10.0) as client:
            p1 = client.post(
                f"{base_url}/persons",
                json={"name": f"In Movie A {unique}", "email": _unique_email("ma")},
            )
            p2 = client.post(
                f"{base_url}/persons",
                json={"name": f"In Movie B {unique}", "email": _unique_email("mb")},
            )
            assert p1.status_code == 201
            assert p2.status_code == 201
            pid1, pid2 = p1.json()["id"], p2.json()["id"]
            m1 = client.post(
                f"{base_url}/movies",
                json={"title": f"Film A {unique}", "genres": [1]},
            )
            m2 = client.post(
                f"{base_url}/movies",
                json={"title": f"Film B {unique}", "genres": [1]},
            )
            assert m1.status_code == 201
            assert m2.status_code == 201
            mid1, mid2 = m1.json()["id"], m2.json()["id"]
            client.post(
                f"{base_url}/movies/{mid1}/persons",
                json=[{"person_id": pid1, "role": "Actor"}],
            )
            client.post(
                f"{base_url}/movies/{mid2}/persons",
                json=[{"person_id": pid2, "role": "Actor"}],
            )
            response = client.post(
                f"{base_url}/persons/search",
                json={"movie_ids": [mid1, mid2], "search": unique, "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        ids = [p["id"] for p in data["items"]]
        assert pid1 in ids
        assert pid2 in ids

    def test_search_persons_by_multiple_genres_or_returns_any_match(self, base_url: str) -> None:
        """POST /persons/search with genres returns persons in movies with any of those genres."""
        unique = uuid.uuid4().hex[:8]
        with httpx.Client(timeout=10.0) as client:
            p1 = client.post(
                f"{base_url}/persons",
                json={"name": f"SciFi Person {unique}", "email": _unique_email("sf")},
            )
            p2 = client.post(
                f"{base_url}/persons",
                json={"name": f"Comedy Person {unique}", "email": _unique_email("cp")},
            )
            assert p1.status_code == 201
            assert p2.status_code == 201
            pid1, pid2 = p1.json()["id"], p2.json()["id"]
            m1 = client.post(
                f"{base_url}/movies",
                json={"title": f"SciFi Film {unique}", "genres": [5]},
            )
            m2 = client.post(
                f"{base_url}/movies",
                json={"title": f"Comedy Film {unique}", "genres": [2]},
            )
            assert m1.status_code == 201
            assert m2.status_code == 201
            client.post(
                f"{base_url}/movies/{m1.json()['id']}/persons",
                json=[{"person_id": pid1, "role": "Actor"}],
            )
            client.post(
                f"{base_url}/movies/{m2.json()['id']}/persons",
                json=[{"person_id": pid2, "role": "Actor"}],
            )
            response = client.post(
                f"{base_url}/persons/search",
                json={"genres": [5, 2], "search": unique, "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        ids = [p["id"] for p in data["items"]]
        assert pid1 in ids
        assert pid2 in ids

    def test_search_persons_paging_respected(self, base_url: str) -> None:
        """POST /persons/search with skip/limit returns correct page."""
        with httpx.Client(timeout=10.0) as client:
            m1 = client.post(
                f"{base_url}/movies",
                json={"title": "Multi-Actor Film", "genres": [1]},
            )
            m2 = client.post(
                f"{base_url}/movies",
                json={"title": "Other Film", "genres": [2]},
            )
            assert m1.status_code == 201
            assert m2.status_code == 201
            movie_id_1, movie_id_2 = m1.json()["id"], m2.json()["id"]
            for i in range(3):
                p = client.post(
                    f"{base_url}/persons",
                    json={"name": f"Actor {i}", "email": _unique_email(f"ap{i}")},
                )
                assert p.status_code == 201
                client.post(
                    f"{base_url}/movies/{movie_id_1}/persons",
                    json=[{"person_id": p.json()["id"], "role": "Actor"}],
                )
            client.post(
                f"{base_url}/movies/{movie_id_2}/persons",
                json=[{"person_id": p.json()["id"], "role": "Actor"}],
            )
            r1 = client.post(
                f"{base_url}/persons/search",
                json={"movie_ids": [movie_id_1, movie_id_2], "skip": 0, "limit": 2},
            )
            r2 = client.post(
                f"{base_url}/persons/search",
                json={"movie_ids": [movie_id_1, movie_id_2], "skip": 2, "limit": 2},
            )
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert len(r1.json()["items"]) <= 2
        assert len(r2.json()["items"]) <= 2
        assert r1.json()["skip"] == 0
        assert r2.json()["skip"] == 2

    def test_search_persons_by_search_matches_name(self, base_url: str) -> None:
        """POST /persons/search with search filters by substring match on name (case-insensitive)."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/persons",
                json={"name": "UniqueNameAlice", "email": _unique_email("alice")},
            )
            client.post(
                f"{base_url}/persons",
                json={"name": "UniqueNameBob", "email": _unique_email("bob")},
            )
            client.post(
                f"{base_url}/persons",
                json={"name": "Other Person", "email": _unique_email("other")},
            )
            response = client.post(
                f"{base_url}/persons/search",
                json={"search": "UniqueName", "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        names = [p["name"] for p in data["items"]]
        assert "UniqueNameAlice" in names
        assert "UniqueNameBob" in names
        assert "Other Person" not in names
        assert data["total"] >= 2

    def test_search_persons_by_search_matches_email(self, base_url: str) -> None:
        """POST /persons/search with search filters by substring match on email (case-insensitive)."""
        email1 = _unique_email("search-email")
        email2 = _unique_email("search-email")
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/persons",
                json={"name": "Person One", "email": email1},
            )
            client.post(
                f"{base_url}/persons",
                json={"name": "Person Two", "email": email2},
            )
            # Search by a substring that appears in both emails (e.g. domain or prefix)
            search_sub = "search-email"
            response = client.post(
                f"{base_url}/persons/search",
                json={"search": search_sub, "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        emails = [p["email"] for p in data["items"]]
        assert email1 in emails
        assert email2 in emails
        assert data["total"] >= 2

    def test_search_persons_by_search_case_insensitive(self, base_url: str) -> None:
        """POST /persons/search with search is case-insensitive."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/persons",
                json={"name": "CaseSensitivePerson", "email": _unique_email("case")},
            )
            response = client.post(
                f"{base_url}/persons/search",
                json={"search": "casesensitive", "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert any("CaseSensitivePerson" in (p.get("name") or "") for p in data["items"])

    def test_search_persons_by_search_empty_ignored(self, base_url: str) -> None:
        """POST /persons/search with empty or whitespace search does not filter by name/email."""
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{base_url}/persons",
                json={"name": "Someone", "email": _unique_email("someone")},
            )
            r1 = client.post(
                f"{base_url}/persons/search",
                json={"skip": 0, "limit": 100},
            )
            r2 = client.post(
                f"{base_url}/persons/search",
                json={"search": "", "skip": 0, "limit": 100},
            )
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r2.json()["total"] == r1.json()["total"]
        assert r2.json()["total"] >= 1

    def test_search_persons_by_search_with_paging(self, base_url: str) -> None:
        """POST /persons/search with search and skip/limit returns correct page."""
        with httpx.Client(timeout=10.0) as client:
            for i in range(4):
                client.post(
                    f"{base_url}/persons",
                    json={"name": f"SearchPerson {i}", "email": _unique_email(f"sp{i}")},
                )
            r1 = client.post(
                f"{base_url}/persons/search",
                json={"search": "SearchPerson", "skip": 0, "limit": 2},
            )
            r2 = client.post(
                f"{base_url}/persons/search",
                json={"search": "SearchPerson", "skip": 2, "limit": 2},
            )
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert len(r1.json()["items"]) <= 2
        assert len(r2.json()["items"]) <= 2
        assert r1.json()["skip"] == 0
        assert r2.json()["skip"] == 2
        assert r1.json()["total"] == r2.json()["total"]
        assert r1.json()["total"] >= 4

    def test_search_persons_by_search_combined_with_movie_ids(self, base_url: str) -> None:
        """POST /persons/search with search and movie_ids applies both filters."""
        with httpx.Client(timeout=10.0) as client:
            p1 = client.post(
                f"{base_url}/persons",
                json={"name": "SharedName In Movie", "email": _unique_email("sim1")},
            )
            p2 = client.post(
                f"{base_url}/persons",
                json={"name": "SharedName Other", "email": _unique_email("sim2")},
            )
            assert p1.status_code == 201
            assert p2.status_code == 201
            pid1, pid2 = p1.json()["id"], p2.json()["id"]
            m = client.post(
                f"{base_url}/movies",
                json={"title": "One Film", "genres": [1]},
            )
            assert m.status_code == 201
            movie_id = m.json()["id"]
            client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": pid1, "role": "Actor"}],
            )
            response = client.post(
                f"{base_url}/persons/search",
                json={"search": "SharedName", "movie_ids": [movie_id], "skip": 0, "limit": 10},
            )
        assert response.status_code == 200
        data = response.json()
        ids = [p["id"] for p in data["items"]]
        assert pid1 in ids
        assert pid2 not in ids

    def test_get_person_movies_returns_detailed_movie_info(self, base_url: str) -> None:
        """GET /persons/{id}/movies returns movies with detailed info (image, rating, release_date, genres)."""
        with httpx.Client(timeout=10.0) as client:
            # Create a person
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "John Actor", "email": _unique_email("johnactor")},
            )
            assert person_resp.status_code == 201
            person_id = person_resp.json()["id"]

            # Create a movie with full details
            movie_resp = client.post(
                f"{base_url}/movies",
                json={
                    "title": "Test Movie with Details",
                    "genres": [1, 3],  # Action, Drama
                    "rating": 8.5,
                    "release_date": "2024-01-15",
                    "description": "A test movie",
                },
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            # Add person to movie as Actor
            add_person_resp = client.post(
                f"{base_url}/movies/{movie_id}/persons",
                json=[{"person_id": person_id, "role": "Actor"}],
            )
            assert add_person_resp.status_code == 201

            # Get person's movies
            response = client.get(f"{base_url}/persons/{person_id}/movies")

        assert response.status_code == 200
        movies = response.json()
        assert len(movies) >= 1

        # Find the movie we just added
        movie_data = next((m for m in movies if m["movie_id"] == movie_id), None)
        assert movie_data is not None

        # Verify all required fields are present
        assert "id" in movie_data  # movie_person id
        assert movie_data["movie_id"] == movie_id
        assert movie_data["movie_title"] == "Test Movie with Details"
        assert movie_data["role"] == "Actor"

        # Verify enhanced fields
        assert "image_path" in movie_data
        assert "rating" in movie_data
        assert movie_data["rating"] == 8.5
        assert "release_date" in movie_data
        assert movie_data["release_date"] == "2024-01-15"
        assert "genres" in movie_data
        assert isinstance(movie_data["genres"], list)
        assert set(movie_data["genres"]) == {1, 3}

    def test_get_person_movies_with_multiple_roles(self, base_url: str) -> None:
        """GET /persons/{id}/movies returns all movies grouped by role correctly."""
        with httpx.Client(timeout=10.0) as client:
            # Create a person
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "Multi Role Person", "email": _unique_email("multirole")},
            )
            assert person_resp.status_code == 201
            person_id = person_resp.json()["id"]

            # Create movies
            movie1_resp = client.post(
                f"{base_url}/movies",
                json={"title": "As Actor Movie", "genres": [1], "rating": 7.0},
            )
            movie2_resp = client.post(
                f"{base_url}/movies",
                json={"title": "As Director Movie", "genres": [2], "rating": 8.0},
            )
            assert movie1_resp.status_code == 201
            assert movie2_resp.status_code == 201
            movie1_id = movie1_resp.json()["id"]
            movie2_id = movie2_resp.json()["id"]

            # Add person to movie 1 as Actor
            client.post(
                f"{base_url}/movies/{movie1_id}/persons",
                json=[{"person_id": person_id, "role": "Actor"}],
            )

            # Add person to movie 2 as Director
            client.post(
                f"{base_url}/movies/{movie2_id}/persons",
                json=[{"person_id": person_id, "role": "Director"}],
            )

            # Get person's movies
            response = client.get(f"{base_url}/persons/{person_id}/movies")

        assert response.status_code == 200
        movies = response.json()
        assert len(movies) == 2

        # Find movies by role
        actor_movies = [m for m in movies if m["role"] == "Actor"]
        director_movies = [m for m in movies if m["role"] == "Director"]

        assert len(actor_movies) == 1
        assert len(director_movies) == 1

        assert actor_movies[0]["movie_title"] == "As Actor Movie"
        assert actor_movies[0]["rating"] == 7.0
        assert director_movies[0]["movie_title"] == "As Director Movie"
        assert director_movies[0]["rating"] == 8.0

    def test_get_person_movies_not_found_returns_404(self, base_url: str) -> None:
        """GET /persons/{id}/movies returns 404 when the person does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{base_url}/persons/999999/movies")
        assert response.status_code == 404

    def test_get_person_movies_empty_list_when_no_movies(self, base_url: str) -> None:
        """GET /persons/{id}/movies returns empty list when person has no movies."""
        with httpx.Client(timeout=10.0) as client:
            # Create a person without movies
            person_resp = client.post(
                f"{base_url}/persons",
                json={"name": "No Movies Person", "email": _unique_email("nomovies")},
            )
            assert person_resp.status_code == 201
            person_id = person_resp.json()["id"]

            # Get person's movies
            response = client.get(f"{base_url}/persons/{person_id}/movies")

        assert response.status_code == 200
        movies = response.json()
        assert isinstance(movies, list)
        assert len(movies) == 0
