"""Integration tests for Movie Image Upload API (run against live API in Docker)."""

from pathlib import Path

import httpx


class TestMovieImageUpload:
    def test_upload_image_returns_200_and_updates_movie(self, base_url: str) -> None:
        """POST /movies/{id}/upload-image uploads an image and updates the movie."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie first
            create_response = client.post(
                f"{base_url}/movies",
                json={"title": "Test Movie for Image Upload", "genres": [1]},
            )
            assert create_response.status_code == 201
            movie_id = create_response.json()["id"]

            # Verify movie has no image initially
            assert create_response.json()["image_path"] is None

            # Upload an image
            test_image_path = Path(__file__).parent / "test_movie_poster.jpg"
            with open(test_image_path, "rb") as f:
                files = {"file": ("test_poster.jpg", f, "image/jpeg")}
                upload_response = client.post(
                    f"{base_url}/movies/{movie_id}/upload-image",
                    files=files,
                )

            assert upload_response.status_code == 200
            data = upload_response.json()

            # Verify response contains image_path
            assert "image_path" in data
            assert data["image_path"] is not None
            assert isinstance(data["image_path"], str)
            assert len(data["image_path"]) > 0

            # Verify the movie was updated with image_path
            get_response = client.get(f"{base_url}/movies/{movie_id}")
            assert get_response.status_code == 200
            assert get_response.json()["image_path"] == data["image_path"]

            # Verify the image can be accessed via static URL
            image_url = f"{base_url}/static/uploads/{data['image_path']}"
            image_response = client.get(image_url)
            assert image_response.status_code == 200
            assert image_response.headers["content-type"].startswith("image/")

    def test_upload_image_replaces_existing_image(self, base_url: str) -> None:
        """Uploading a new image replaces the existing one."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            create_response = client.post(
                f"{base_url}/movies",
                json={"title": "Test Movie for Image Replacement", "genres": [2]},
            )
            movie_id = create_response.json()["id"]

            # Upload first image
            test_image_path = Path(__file__).parent / "test_movie_poster.jpg"
            with open(test_image_path, "rb") as f:
                files = {"file": ("poster1.jpg", f, "image/jpeg")}
                upload1 = client.post(
                    f"{base_url}/movies/{movie_id}/upload-image",
                    files=files,
                )

            first_image_path = upload1.json()["image_path"]

            # Upload second image
            with open(test_image_path, "rb") as f:
                files = {"file": ("poster2.jpg", f, "image/jpeg")}
                upload2 = client.post(
                    f"{base_url}/movies/{movie_id}/upload-image",
                    files=files,
                )

            second_image_path = upload2.json()["image_path"]

            # Verify the image path changed
            assert first_image_path != second_image_path

            # Verify movie has the new image
            get_response = client.get(f"{base_url}/movies/{movie_id}")
            assert get_response.json()["image_path"] == second_image_path

    def test_upload_image_wrong_file_type_returns_400(self, base_url: str) -> None:
        """POST /movies/{id}/upload-image with non-image file returns 400."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie
            create_response = client.post(
                f"{base_url}/movies",
                json={"title": "Test Movie for Invalid File Type", "genres": [3]},
            )
            movie_id = create_response.json()["id"]

            # Try to upload a text file
            files = {"file": ("test.txt", b"This is not an image", "text/plain")}
            upload_response = client.post(
                f"{base_url}/movies/{movie_id}/upload-image",
                files=files,
            )

            assert upload_response.status_code == 400
            assert "detail" in upload_response.json()
            assert "Invalid file type" in upload_response.json()["detail"]

    def test_upload_image_to_nonexistent_movie_returns_404(self, base_url: str) -> None:
        """POST /movies/{id}/upload-image with non-existent movie ID returns 404."""
        with httpx.Client(timeout=10.0) as client:
            test_image_path = Path(__file__).parent / "test_movie_poster.jpg"
            with open(test_image_path, "rb") as f:
                files = {"file": ("poster.jpg", f, "image/jpeg")}
                upload_response = client.post(
                    f"{base_url}/movies/999999/upload-image",
                    files=files,
                )

            assert upload_response.status_code == 404
            assert "detail" in upload_response.json()

    def test_upload_image_supports_different_formats(self, base_url: str) -> None:
        """Image upload supports JPEG, PNG, GIF, and WebP formats."""
        test_image_path = Path(__file__).parent / "test_movie_poster.jpg"

        formats = [
            ("test.jpg", "image/jpeg"),
            ("test.jpeg", "image/jpeg"),
            ("test.png", "image/png"),
            ("test.gif", "image/gif"),
            ("test.webp", "image/webp"),
        ]

        with httpx.Client(timeout=10.0) as client:
            for filename, content_type in formats:
                # Create a new movie for each format test
                create_response = client.post(
                    f"{base_url}/movies",
                    json={"title": f"Test Movie for {filename}", "genres": [1]},
                )
                movie_id = create_response.json()["id"]

                # Upload image with specified content type
                with open(test_image_path, "rb") as f:
                    files = {"file": (filename, f, content_type)}
                    upload_response = client.post(
                        f"{base_url}/movies/{movie_id}/upload-image",
                        files=files,
                    )

                assert upload_response.status_code == 200, f"Failed for format: {content_type}"
                assert upload_response.json()["image_path"] is not None

    def test_upload_image_too_large_returns_400(self, base_url: str) -> None:
        """POST /movies/{id}/upload-image with file > 10MB returns 400."""
        with httpx.Client(timeout=30.0) as client:
            # Create a movie
            create_response = client.post(
                f"{base_url}/movies",
                json={"title": "Test Movie for Large File", "genres": [4]},
            )
            movie_id = create_response.json()["id"]

            # Create a file larger than 10MB (11MB of zeros)
            large_content = b"0" * (11 * 1024 * 1024)
            files = {"file": ("large.jpg", large_content, "image/jpeg")}
            upload_response = client.post(
                f"{base_url}/movies/{movie_id}/upload-image",
                files=files,
            )

            assert upload_response.status_code == 400
            assert "detail" in upload_response.json()
            assert "too large" in upload_response.json()["detail"].lower()

    def test_upload_image_preserves_other_movie_fields(self, base_url: str) -> None:
        """Uploading an image does not affect other movie fields."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie with all fields
            movie_data = {
                "title": "Complete Movie",
                "description": "A movie with all fields",
                "release_date": "2023-01-15",
                "genres": [1, 5],
                "rating": 8.5,
            }
            create_response = client.post(f"{base_url}/movies", json=movie_data)
            movie_id = create_response.json()["id"]
            original_movie = create_response.json()

            # Upload an image
            test_image_path = Path(__file__).parent / "test_movie_poster.jpg"
            with open(test_image_path, "rb") as f:
                files = {"file": ("poster.jpg", f, "image/jpeg")}
                client.post(
                    f"{base_url}/movies/{movie_id}/upload-image",
                    files=files,
                )

            # Verify all other fields remain unchanged
            get_response = client.get(f"{base_url}/movies/{movie_id}")
            updated_movie = get_response.json()

            assert updated_movie["title"] == original_movie["title"]
            assert updated_movie["description"] == original_movie["description"]
            assert updated_movie["release_date"] == original_movie["release_date"]
            assert updated_movie["genres"] == original_movie["genres"]
            assert updated_movie["rating"] == original_movie["rating"]
            assert updated_movie["image_path"] is not None  # Only this should change

    def test_movie_list_includes_image_path(self, base_url: str) -> None:
        """GET /movies returns movies with image_path field."""
        with httpx.Client(timeout=10.0) as client:
            # Create a movie and upload an image
            create_response = client.post(
                f"{base_url}/movies",
                json={"title": "Movie for List Test", "genres": [1]},
            )
            movie_id = create_response.json()["id"]

            test_image_path = Path(__file__).parent / "test_movie_poster.jpg"
            with open(test_image_path, "rb") as f:
                files = {"file": ("poster.jpg", f, "image/jpeg")}
                upload_response = client.post(
                    f"{base_url}/movies/{movie_id}/upload-image",
                    files=files,
                )

            image_path = upload_response.json()["image_path"]

            # Get the specific movie to verify image_path is returned
            movie_response = client.get(f"{base_url}/movies/{movie_id}")
            assert movie_response.status_code == 200

            movie_data = movie_response.json()
            assert "image_path" in movie_data
            assert movie_data["image_path"] == image_path

            # Also verify image_path appears in list endpoint
            list_response = client.get(f"{base_url}/movies?limit=1")
            assert list_response.status_code == 200
            assert "image_path" in list_response.json()["items"][0]
