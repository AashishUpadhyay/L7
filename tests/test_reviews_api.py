"""Integration tests for Movie Reviews API (run against live API in Docker)."""

import httpx
import pytest


class TestMovieReviewsApi:
    """Tests for movie review endpoints."""

    def test_get_reviews_for_nonexistent_movie_returns_404(self, base_url: str) -> None:
        """GET /movies/{id}/reviews returns 404 when movie does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.get(f"{base_url}/movies/999999/reviews")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_get_reviews_for_movie_with_no_reviews_returns_empty_list(self, base_url: str) -> None:
        """GET /movies/{id}/reviews returns empty list when movie has no reviews."""
        # First create a movie
        with httpx.Client(timeout=10.0) as client:
            create_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie Without Reviews", "genres": [3]},
            )
            assert create_resp.status_code == 201
            movie_id = create_resp.json()["id"]

            # Get reviews for the new movie
            response = client.get(f"{base_url}/movies/{movie_id}/reviews")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["skip"] == 0
        assert data["limit"] == 20
        assert data["average_rating"] is None

    def test_create_review_returns_201_and_body(self, base_url: str) -> None:
        """POST /movies/{id}/reviews creates a review and returns 201."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie first
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Great Movie", "genres": [1], "rating": 8.5},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            # Create a review
            review_payload = {
                "author_name": "John Doe",
                "rating": 9.5,
                "content": "Amazing movie! The acting was superb and the story kept me engaged.",
            }
            response = client.post(f"{base_url}/movies/{movie_id}/reviews", json=review_payload)

        assert response.status_code == 201
        data = response.json()

        assert "id" in data
        assert isinstance(data["id"], int)
        assert data["movie_id"] == movie_id
        assert data["author_name"] == review_payload["author_name"]
        assert data["rating"] == review_payload["rating"]
        assert data["content"] == review_payload["content"]
        assert "created_at" in data

    def test_create_review_for_nonexistent_movie_returns_404(self, base_url: str) -> None:
        """POST /movies/{id}/reviews returns 404 when movie does not exist."""
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{base_url}/movies/999999/reviews",
                json={"author_name": "Test User", "rating": 8.0, "content": "Great movie!"},
            )

        assert response.status_code == 404

    @pytest.mark.parametrize(
        "invalid_payload,expected_status",
        [
            ({"rating": 8.0, "content": "Good"}, 422),  # Missing author_name
            ({"author_name": "John", "content": "Good"}, 422),  # Missing rating
            ({"author_name": "John", "rating": 8.0}, 422),  # Missing content
            ({"author_name": "", "rating": 8.0, "content": "Good"}, 422),  # Empty author_name
            ({"author_name": "John", "rating": 11.0, "content": "Good"}, 422),  # Rating > 10
            ({"author_name": "John", "rating": -1.0, "content": "Good"}, 422),  # Rating < 0
        ],
    )
    def test_create_review_with_invalid_data_returns_422(
        self, base_url: str, invalid_payload: dict, expected_status: int
    ) -> None:
        """POST /movies/{id}/reviews with invalid data returns 422."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie first
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Test Movie", "genres": [2]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            # Try to create invalid review
            response = client.post(f"{base_url}/movies/{movie_id}/reviews", json=invalid_payload)

        assert response.status_code == expected_status

    def test_get_reviews_returns_all_reviews_for_movie(self, base_url: str) -> None:
        """GET /movies/{id}/reviews returns all reviews for a movie."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Popular Movie", "genres": [5]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            # Create multiple reviews
            reviews = [
                {"author_name": "Alice", "rating": 9.0, "content": "Excellent!"},
                {"author_name": "Bob", "rating": 7.5, "content": "Pretty good."},
                {"author_name": "Charlie", "rating": 8.5, "content": "Loved it!"},
            ]

            for review in reviews:
                create_resp = client.post(f"{base_url}/movies/{movie_id}/reviews", json=review)
                assert create_resp.status_code == 201

            # Get all reviews
            response = client.get(f"{base_url}/movies/{movie_id}/reviews")

        assert response.status_code == 200
        data = response.json()

        assert len(data["items"]) == 3
        assert data["total"] == 3
        assert data["skip"] == 0
        assert data["limit"] == 20

        # Check average rating is calculated correctly
        expected_avg = (9.0 + 7.5 + 8.5) / 3
        assert data["average_rating"] == pytest.approx(expected_avg, rel=0.1)

        # Verify all review data is present
        author_names = {item["author_name"] for item in data["items"]}
        assert author_names == {"Alice", "Bob", "Charlie"}

    def test_get_reviews_pagination_works(self, base_url: str) -> None:
        """GET /movies/{id}/reviews supports pagination with skip and limit."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie with Many Reviews", "genres": [3]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            # Create 5 reviews
            for i in range(5):
                client.post(
                    f"{base_url}/movies/{movie_id}/reviews",
                    json={
                        "author_name": f"Reviewer{i}",
                        "rating": 7.0 + i * 0.5,
                        "content": f"Review number {i}",
                    },
                )

            # Get first page (2 items)
            page1 = client.get(f"{base_url}/movies/{movie_id}/reviews?skip=0&limit=2")
            assert page1.status_code == 200
            page1_data = page1.json()
            assert len(page1_data["items"]) == 2
            assert page1_data["total"] == 5
            assert page1_data["skip"] == 0
            assert page1_data["limit"] == 2

            # Get second page (2 items)
            page2 = client.get(f"{base_url}/movies/{movie_id}/reviews?skip=2&limit=2")
            assert page2.status_code == 200
            page2_data = page2.json()
            assert len(page2_data["items"]) == 2
            assert page2_data["total"] == 5
            assert page2_data["skip"] == 2
            assert page2_data["limit"] == 2

            # Verify no overlap between pages
            page1_ids = {item["id"] for item in page1_data["items"]}
            page2_ids = {item["id"] for item in page2_data["items"]}
            assert len(page1_ids & page2_ids) == 0

    def test_delete_review_returns_204(self, base_url: str) -> None:
        """DELETE /movies/{id}/reviews/{review_id} returns 204 on success."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie to Delete Review", "genres": [2]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            # Create a review
            review_resp = client.post(
                f"{base_url}/movies/{movie_id}/reviews",
                json={"author_name": "Temp User", "rating": 6.0, "content": "This will be deleted"},
            )
            assert review_resp.status_code == 201
            review_id = review_resp.json()["id"]

            # Delete the review
            delete_resp = client.delete(f"{base_url}/movies/{movie_id}/reviews/{review_id}")

        assert delete_resp.status_code == 204

        # Verify review is actually deleted
        with httpx.Client(timeout=10.0) as client:
            get_reviews = client.get(f"{base_url}/movies/{movie_id}/reviews")
            assert get_reviews.status_code == 200
            assert len(get_reviews.json()["items"]) == 0

    def test_delete_nonexistent_review_returns_404(self, base_url: str) -> None:
        """DELETE /movies/{id}/reviews/{review_id} returns 404 when review doesn't exist."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Test Movie", "genres": [1]},
            )
            assert movie_resp.status_code == 201
            movie_id = movie_resp.json()["id"]

            # Try to delete non-existent review
            response = client.delete(f"{base_url}/movies/{movie_id}/reviews/999999")

        assert response.status_code == 404

    def test_delete_review_from_wrong_movie_returns_404(self, base_url: str) -> None:
        """DELETE /movies/{id}/reviews/{review_id} returns 404 when review belongs to different movie."""
        with httpx.Client(timeout=10.0) as client:
            # Create two movies
            movie1_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie 1", "genres": [1]},
            )
            movie1_id = movie1_resp.json()["id"]

            movie2_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie 2", "genres": [2]},
            )
            movie2_id = movie2_resp.json()["id"]

            # Create review for movie1
            review_resp = client.post(
                f"{base_url}/movies/{movie1_id}/reviews",
                json={"author_name": "Test User", "rating": 8.0, "content": "Great!"},
            )
            review_id = review_resp.json()["id"]

            # Try to delete the review using movie2's ID
            response = client.delete(f"{base_url}/movies/{movie2_id}/reviews/{review_id}")

        assert response.status_code == 404

    def test_reviews_are_ordered_by_created_at_desc(self, base_url: str) -> None:
        """GET /movies/{id}/reviews returns reviews ordered by created_at (newest first)."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie with Ordered Reviews", "genres": [6]},
            )
            movie_id = movie_resp.json()["id"]

            # Create reviews with slight delays to ensure different timestamps
            review_ids = []
            for i in range(3):
                review_resp = client.post(
                    f"{base_url}/movies/{movie_id}/reviews",
                    json={"author_name": f"User{i}", "rating": 8.0, "content": f"Review {i}"},
                )
                review_ids.append(review_resp.json()["id"])

            # Get reviews
            response = client.get(f"{base_url}/movies/{movie_id}/reviews")
            data = response.json()

            # Verify reviews are in descending order by created_at
            created_times = [item["created_at"] for item in data["items"]]
            assert created_times == sorted(created_times, reverse=True)

    def test_average_rating_updates_after_adding_reviews(self, base_url: str) -> None:
        """Average rating is recalculated correctly after adding new reviews."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie Rating Test", "genres": [4]},
            )
            movie_id = movie_resp.json()["id"]

            # Add first review
            client.post(
                f"{base_url}/movies/{movie_id}/reviews",
                json={"author_name": "User1", "rating": 8.0, "content": "Good"},
            )

            reviews1 = client.get(f"{base_url}/movies/{movie_id}/reviews")
            assert reviews1.json()["average_rating"] == 8.0

            # Add second review
            client.post(
                f"{base_url}/movies/{movie_id}/reviews",
                json={"author_name": "User2", "rating": 6.0, "content": "Okay"},
            )

            reviews2 = client.get(f"{base_url}/movies/{movie_id}/reviews")
            assert reviews2.json()["average_rating"] == pytest.approx(7.0, rel=0.1)

            # Add third review
            client.post(
                f"{base_url}/movies/{movie_id}/reviews",
                json={"author_name": "User3", "rating": 10.0, "content": "Perfect!"},
            )

            reviews3 = client.get(f"{base_url}/movies/{movie_id}/reviews")
            expected_avg = (8.0 + 6.0 + 10.0) / 3
            assert reviews3.json()["average_rating"] == pytest.approx(expected_avg, rel=0.1)

    def test_deleting_movie_cascades_to_reviews(self, base_url: str) -> None:
        """Deleting a movie should cascade delete all its reviews."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            movie_resp = client.post(
                f"{base_url}/movies",
                json={"title": "Movie to Delete with Reviews", "genres": [1]},
            )
            movie_id = movie_resp.json()["id"]

            # Create reviews
            for i in range(3):
                client.post(
                    f"{base_url}/movies/{movie_id}/reviews",
                    json={"author_name": f"User{i}", "rating": 7.0 + i, "content": f"Review {i}"},
                )

            # Verify reviews exist
            get_reviews = client.get(f"{base_url}/movies/{movie_id}/reviews")
            assert get_reviews.json()["total"] == 3

            # Delete the movie
            delete_movie = client.delete(f"{base_url}/movies/{movie_id}")
            assert delete_movie.status_code == 204

            # Verify movie is gone
            get_movie = client.get(f"{base_url}/movies/{movie_id}")
            assert get_movie.status_code == 404

            # Verify we can't get reviews for deleted movie (should also return 404)
            get_reviews_after = client.get(f"{base_url}/movies/{movie_id}/reviews")
            assert get_reviews_after.status_code == 404
