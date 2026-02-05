# IMDB API

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

   With the API already up:

   ```bash
   docker compose run --rm imdb-integration-tests
   ```

   This runs pytest in a container against the API and writes JUnit XML to `.appdata/integrationtests/junit.xml`.

4. **Data and logs on the host**
   - DB data: `.appdata/postgres/`
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
