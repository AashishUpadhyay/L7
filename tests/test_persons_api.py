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
