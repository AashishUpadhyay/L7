# Integration Tests

This directory contains integration tests for the IMDB API.

## Test Files

### Backend Integration Tests (Python/Pytest)

- `test_movies_api.py` - Tests for movie CRUD operations
- `test_persons_api.py` - Tests for person CRUD operations and movie associations
  - Person CRUD operations (create, read, update, delete)
  - Person search with filters (by movie_ids, genres, roles, search text)
  - GET /persons/{id}/movies - Returns movies with enhanced details (image_path, rating, release_date, genres)
- `test_reviews_api.py` - Tests for movie review endpoints (GET, POST, DELETE)
- `test_admin_api.py` - Tests for admin endpoints (clean, seed, reset)
- `test_movie_image_upload.py` - Tests for movie image upload functionality
- `conftest.py` - Pytest fixtures and configuration

### Frontend UI Tests (Vitest/React Testing Library)

Located in `ui/src/`:

- **Public Pages:**
  - `pages/PersonProfilePage.test.tsx` - Tests for public person profile page
    - Person info display (name, avatar, credit count)
    - Movies grouped by role (Actor, Director, Producer)
    - Movie cards with images, ratings, release years, genres
    - Navigation links to movie detail pages
    - Error handling
  - `pages/MovieDetailPage.test.tsx` - Tests for public movie detail page
    - Movie info display (title, description, rating, genres)
    - Clickable cast & crew links to person profiles
    - Reviews section (display, create)
    - Watch Later functionality
    - Navigation links

- **Admin Pages:**
  - `pages/DashboardPage.test.tsx` - Admin dashboard tests
  - `pages/ActorPage.test.tsx` - Actor list page tests
  - `pages/ActorDetailPage.test.tsx` - Actor detail page tests
  - `pages/FilmPage.test.tsx` - Film list page tests
  - `pages/FilmDetailPage.test.tsx` - Film detail page tests

- **Components:**
  - `components/actor/ActorFormModal.test.tsx` - Actor form modal tests
  - `components/film/FilmFormModal.test.tsx` - Film form modal tests
  - `components/common/DeleteConfirmModal.test.tsx` - Delete confirmation modal tests
  - `components/layout/Layout.test.tsx` - Layout component tests
  - `components/layout/Header.test.tsx` - Header component tests
  - `components/layout/Sidebar.test.tsx` - Sidebar component tests

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
