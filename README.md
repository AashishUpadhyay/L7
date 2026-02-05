# IMDB API

[![CI](https://github.com/AashishUpadhyay/L7/actions/workflows/ci.yml/badge.svg)](https://github.com/AashishUpadhyay/L7/actions/workflows/ci.yml)

IMDB-style API: Movies, Persons, and roles with CRUD and integration tests.

---

## Development setup

### Docker (recommended)

**Prerequisites:** Docker and Docker Compose.

1. **Build and start the API and database**

   ```bash
   make build-up
   ```

   Or step by step:

   ```bash
   make build      # build images
   make up         # start imdb-db and imdb-api in background
   ```

   The API waits for Postgres, runs Alembic migrations, then starts on **http://localhost:9000**.

2. **Useful commands**

   | Command        | Description                  |
   | -------------- | ---------------------------- |
   | `make logs`    | Stream API and DB logs       |
   | `make ps`      | List running containers      |
   | `make down`    | Stop and remove containers   |
   | `make restart` | Stop then start (no rebuild) |

3. **Run integration tests (in Docker)**

   Tests use a **separate API and database** (`imdb-api-test`, `imdb-db-test`) so they never touch the main app data.

   **Option A – one command (starts test stack, waits, then runs tests):**

   ```bash
   make test-docker-full
   ```

   **Option B – step by step:**

   ```bash
   make up-api-test    # start imdb-db-test and imdb-api-test (port 9001)
   make wait-api       # wait for test API health
   make test-docker    # run pytest in container
   ```

   JUnit XML is written to `.appdata/integrationtests/junit.xml`.

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

   Rebuild so the API container picks up changes:

   ```bash
   make build-up
   ```

   For only the API: `docker compose build imdb-api && docker compose up -d imdb-api`

---

### Local (uv)

**Prerequisites:** Python 3.11+ and [uv](https://docs.astral.sh/uv/).

1. **Install dependencies**

   ```bash
   uv sync
   ```

   Installs production and dev dependencies (including pytest, httpx).

2. **Database**

   Either use Docker for Postgres only:

   ```bash
   docker compose up -d imdb-db
   ```

   Then run migrations from the host:

   ```bash
   uv run alembic -c alembic.ini upgrade head
   ```

   Or point to an existing Postgres with env vars: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (defaults in `app/db/config.py`).

3. **Run the API**

   ```bash
   make run
   ```

   Or:

   ```bash
   uv run uvicorn app.main:app --reload --port 9000
   ```

   API: **http://localhost:9000**. Docs: **http://localhost:9000/docs**.

4. **Run integration tests (local)**

   With the API running (Docker or local):

   ```bash
   make test
   ```

   Or:

   ```bash
   uv run python -m pytest tests/ -v --tb=short
   ```

   Tests use `API_HOST=localhost` and `API_PORT=9000` by default (see `tests/conftest.py`).

5. **Lockfile and deps**

   ```bash
   make lock   # uv lock
   make sync  # uv sync
   ```

6. **Linting**

   Linting runs in CI and must pass before integration tests. Locally:

   ```bash
   make lint      # Check only (fails on any issue)
   make lint-fix  # Auto-fix with ruff (check --fix + format)
   ```

   Uses [Ruff](https://docs.astral.sh/ruff/) (configured in `pyproject.toml`).

---

## API documentation (Swagger)

When the API is running, interactive OpenAPI docs are available:

| URL                                    | Description                                                     |
| -------------------------------------- | --------------------------------------------------------------- |
| **http://localhost:9000/docs**         | Swagger UI – try out endpoints and see request/response schemas |
| **http://localhost:9000/redoc**        | ReDoc – alternative documentation view                          |
| **http://localhost:9000/openapi.json** | Raw OpenAPI 3 schema                                            |

Tags in Swagger: **movies** (CRUD, bulk create, add persons), **persons** (CRUD, list). Request body examples are included for “Try it out”.
