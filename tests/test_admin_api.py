"""Integration tests for Admin API (run against live API in Docker)."""

import httpx


class TestAdminDbClean:
    def test_clean_returns_200_and_empties_database(self, base_url: str) -> None:
        """POST /admin/db/clean returns 200 and removes all movies and persons."""
        with httpx.Client(timeout=10.0) as client:
            # Ensure at least one movie exists
            client.post(
                f"{base_url}/movies",
                json={"title": "To Be Cleaned", "genres": [1]},
            )
            list_before = client.get(f"{base_url}/movies?limit=1")
            assert list_before.status_code == 200
            assert list_before.json()["total"] >= 1

            response = client.post(f"{base_url}/admin/db/clean")

        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert "message" in data

        with httpx.Client(timeout=10.0) as client:
            list_after = client.get(f"{base_url}/movies?limit=1")
        assert list_after.status_code == 200
        assert list_after.json()["total"] == 0
        assert list_after.json()["items"] == []


class TestAdminDbSeed:
    def test_seed_when_empty_returns_ok_and_loads_data(self, base_url: str) -> None:
        """POST /admin/db/seed when DB has no movies returns 200 and seeds from data.json."""
        with httpx.Client(timeout=10.0) as client:
            client.post(f"{base_url}/admin/db/clean")
            response = client.post(f"{base_url}/admin/db/seed")

        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert "message" in data

        with httpx.Client(timeout=10.0) as client:
            list_resp = client.get(f"{base_url}/movies?limit=5")
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] >= 1
        assert len(list_resp.json()["items"]) >= 1

    def test_seed_when_not_empty_returns_skipped(self, base_url: str) -> None:
        """POST /admin/db/seed when DB already has movies returns 200 with status skipped."""
        with httpx.Client(timeout=10.0) as client:
            client.post(f"{base_url}/admin/db/clean")
            client.post(
                f"{base_url}/movies",
                json={"title": "Existing Movie", "genres": [2]},
            )
            response = client.post(f"{base_url}/admin/db/seed")

        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "skipped"
        assert "message" in data


class TestAdminDbReset:
    def test_reset_returns_200_and_db_has_data(self, base_url: str) -> None:
        """POST /admin/db/reset returns 200, cleans then seeds; GET /movies returns data."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(f"{base_url}/admin/db/reset")

        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert "message" in data

        with httpx.Client(timeout=10.0) as client:
            list_resp = client.get(f"{base_url}/movies?limit=5")
        assert list_resp.status_code == 200
        assert list_resp.json()["total"] >= 1
        assert len(list_resp.json()["items"]) >= 1
