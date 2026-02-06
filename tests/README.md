# Integration Tests

This directory contains integration tests for the IMDB API.

## Test Files

- `test_movies_api.py` - Tests for movie CRUD operations
- `test_persons_api.py` - Tests for person CRUD operations
- `test_admin_api.py` - Tests for admin endpoints (clean, seed, reset)
- `test_movie_image_upload.py` - Tests for movie image upload functionality
- `conftest.py` - Pytest fixtures and configuration

## Test Assets

- `test_movie_poster.jpg` - Sample image used for image upload tests (copied from `app/db/images/`)

## Running Tests

### Docker (recommended)

Run all tests in Docker:

```bash
make test-docker-full
```

Or step-by-step:

```bash
make up-api-test      # Start test API and DB
make wait-api         # Wait for API to be ready
make test-docker      # Run tests in container
make down-api-test    # Clean up test services
```

### Local

With the API running locally:

```bash
make test
```

Or directly with pytest:

```bash
uv run pytest tests/ -v --tb=short
```

## Test Configuration

- Tests use the `base_url` fixture from `conftest.py`
- Default: `http://localhost:9000`
- Override with environment variables: `API_HOST` and `API_PORT`
- Test database is isolated from main database
