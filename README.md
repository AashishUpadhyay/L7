# IMDB API

[![CI](https://github.com/AashishUpadhyay/L7/actions/workflows/ci.yml/badge.svg)](https://github.com/AashishUpadhyay/L7/actions/workflows/ci.yml)

IMDB-style API and admin panel: Movies, Persons (actors), and their roles—with full CRUD, search, and integration tests.

---

## Prerequisites

Install these before building or running the project:

| Tool                                 | Purpose                                    | Notes                                                                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **make**                             | Build and run commands                     | All instructions use the project `Makefile` (e.g. `make build`, `make test-ui`). Pre-installed on macOS/Linux; on Windows use WSL, Cygwin, or [GnuWin32 Make](http://gnuwin32.sourceforge.net/packages/make.htm). |
| **[uv](https://docs.astral.sh/uv/)** | Python package manager and runner          | Backend (API, lint, integration tests). Uses Python 3.11.                                                                                                                                                         |
| **Docker** & **Docker Compose**      | Containers for API, DB, admin panel, tests | Required for `make build`, `make build-up`, and integration tests in Docker.                                                                                                                                      |
| **Node.js** (v18+) & **npm**         | Admin panel and UI tests                   | Required for `admin-panel/` (dev server, `make test-ui`). `make build` runs UI tests before building images.                                                                                                      |

- **make:** Usually pre-installed on macOS and Linux. On Windows, use [WSL](https://docs.microsoft.com/en-us/windows/wsl/), Cygwin, or install Make for Windows.
- **Docker (recommended):** Install [Docker Engine](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).
- **Local backend:** `uv` will install Python; or use Python 3.11+ and then `uv sync`.
- **Admin panel:** Install [Node.js](https://nodejs.org/) (LTS, e.g. 20.x); `npm` is included.

---

## Overview

This repository provides:

- **Backend API** (FastAPI): REST API for **Movies** and **Persons** (people associated with movies). It supports **CRUD** and **search** on both resources, plus linking persons to movies with roles (e.g. cast, director).
- **Admin panel** (React + TypeScript): Web UI to manage movies and persons—create, read, update, delete, and search—backed by the API.
- **Database**: PostgreSQL with Alembic migrations; runs via Docker or a local Postgres instance.

---

## URLs (when services are running)

| Service      | URL                                | Description                                    |
| ------------ | ---------------------------------- | ---------------------------------------------- |
| **UI**       | http://localhost:3000              | Admin panel (Docker); movies & persons CRUD UI |
| **UI (dev)** | http://localhost:5173              | Admin panel (Vite dev server)                  |
| **API**      | http://localhost:9000              | REST API base URL                              |
| **Swagger**  | http://localhost:9000/docs         | Interactive API docs (Swagger UI)              |
| **ReDoc**    | http://localhost:9000/redoc        | Alternative API documentation                  |
| **OpenAPI**  | http://localhost:9000/openapi.json | Raw OpenAPI 3 schema                           |

---

## Development

### Docker (recommended)

1. **Build and start the API and database**

   ```bash
   make build-up
   ```

   Or step by step:

   ```bash
   make build      # build images
   make up         # start imdb-db and imdb-api in background
   ```

   To also run the **admin panel**:

   ```bash
   make build-ui   # build admin-panel image (optional, if not already built)
   docker compose up -d imdb-db imdb-api admin-panel
   ```

2. **Useful commands**

   | Command        | Description                  |
   | -------------- | ---------------------------- |
   | `make logs`    | Stream API and DB logs       |
   | `make ps`      | List running containers      |
   | `make down`    | Stop and remove containers   |
   | `make restart` | Stop then start (no rebuild) |

3. **Run integration tests (in Docker)**

   **Option A – one command:**

   ```bash
   make test-docker-full
   ```

   **Option B – step by step:**

   ```bash
   make up-api-test    # start imdb-db-test and imdb-api-test (port 9001)
   make wait-api       # wait for test API health
   make test-docker    # run pytest in container
   ```

   **Clean test DB:** To reset the test database (e.g. for a fresh run), remove the test volume and start again:

   ```bash
   docker compose down imdb-api-test imdb-integration-tests 2>/dev/null; docker volume rm imdb_postgres_test_data 2>/dev/null; make up-api-test && make wait-api && make test-docker
   ```

4. **Data and logs on the host**
   - Main DB data: `.appdata/postgres/`
   - Test DB data: Docker volume `imdb_postgres_test_data` (separate from main)
   - API data (e.g. logs): `.appdata/app/` → logs at `.appdata/app/logs/app.log`
   - Test results: `.appdata/integrationtests/junit.xml`

5. **After code changes**

   ```bash
   make build-up
   ```

   For only the API: `docker compose build imdb-api && docker compose up -d imdb-api`

---

### Local (uv)

1. **Install dependencies**

   ```bash
   uv sync
   ```

2. **Database**

   Either use Docker for Postgres only:

   ```bash
   docker compose up -d imdb-db
   ```

   ```bash
   uv run alembic -c alembic.ini upgrade head
   ```

   Or use an existing Postgres via `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`.

3. **Run the API**

   ```bash
   make run
   ```

   Or:

   ```bash
   uv run uvicorn app.main:app --reload --port 9000
   ```

4. **Run the admin panel (optional)**

   From `admin-panel/`:

   ```bash
   npm install
   npm run dev
   ```

   Open **http://localhost:5173**. Set `VITE_API_BASE_URL` in `.env` to point to another API.

5. **Run integration tests (local)**

   With the API running:

   ```bash
   make test
   ```

   Or:

   ```bash
   uv run python -m pytest tests/ -v --tb=short
   ```

6. **Lockfile and deps**

   ```bash
   make lock   # uv lock
   make sync  # uv sync
   ```

7. **Linting**

   ```bash
   make lint      # Check only
   make lint-fix  # Auto-fix with Ruff
   ```

---

## Database Seeding

The API automatically seeds the database with sample data from `app/db/data.json` when:
- The application starts up
- The database is empty (no movies exist)

This ensures you have data to work with immediately after starting the application.

**Manual seeding via API:**
- **POST** `/admin/db/seed` - Seed database (only if empty)
- **POST** `/admin/db/clean` - Remove all movies and persons
- **POST** `/admin/db/reset` - Clean then seed (full reset)

---

## Image Upload

Movies support image uploads through both the API and admin panel UI.

### Storage Configuration

The storage backend is configurable via environment variables (see `.env.example`):

```bash
# Storage backend: "local" (default), "s3", or "gcs"
STORAGE_BACKEND=local

# Local filesystem settings
STORAGE_LOCAL_PATH=./uploads
STORAGE_LOCAL_URL=/static/uploads
```

**Supported Backends:**
- **Local Filesystem** (default): Stores files in `./uploads` directory
- **AWS S3** (planned): For production deployments with S3
- **Google Cloud Storage** (planned): For GCS deployments

**Docker Volume Mounts:**

When running in Docker, uploaded images are persisted via volume mounts defined in `docker-compose.yml`:

```yaml
volumes:
  - .appdata/uploads:/app/uploads
```

This ensures:
- Uploaded images persist across container restarts
- Images are accessible at `http://localhost:9000/static/uploads/filename.jpg`
- Files are stored in `.appdata/uploads/` on your host machine
- No data loss when containers are recreated

### Upload API

- **POST** `/movies/{movie_id}/upload-image` - Upload an image for a movie
- **Accepted formats**: JPEG, PNG, GIF, WebP
- **Max file size**: 10MB

### UI Upload

In the admin panel, edit any movie to upload an image:
1. Click "Edit" on a movie
2. Scroll to the "Movie Image" section
3. Select an image file
4. Click "Upload"

Images are displayed in the movie list and detail pages.

---

## API documentation (Swagger)

When the API is running, interactive OpenAPI docs are available at the URLs in the table above. In Swagger (**/docs**): tags **movies** (CRUD, bulk create, add persons) and **persons** (CRUD, list). Request body examples are included for “Try it out”.
