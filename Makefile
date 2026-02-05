.PHONY: build up down clean clean-all logs ps restart lock sync run test lint lint-fix build-up up-api up-api-test wait-api test-docker test-docker-full ci-dirs

# Lint (run before build; also used in CI)
lint:
	uv run ruff check app tests alembic
	uv run ruff format --check app tests alembic

# Build and run commands (lint first to fail fast on style/errors)
build: lint
	docker compose build

# Build images then start containers (use after code changes to pick up new API/tests)
build-up: build
	docker compose up -d

up:
	docker compose up -d

# Start only API and DB (for local dev / admin panel)
up-api:
	docker compose up -d imdb-db imdb-api

# Start test-only API and DB (for integration tests; isolated from main app)
up-api-test:
	docker compose up -d imdb-db-test imdb-api-test

# Wait for API health (for CI). Uses test API on port 9001.
wait-api:
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
	  if curl -sf http://localhost:9001/health > /dev/null; then echo "API ready"; exit 0; fi; \
	  echo "Waiting for API... ($$i/30)"; sleep 2; \
	done; echo "API did not become ready"; exit 1

# Run integration tests in Docker (test API must be up: use 'make up-api-test' and 'make wait-api' first, or use 'make test-docker-full').
test-docker:
	docker compose run --rm imdb-integration-tests

# Start test stack, wait for API, then run integration tests (all-in-one for CI or local).
test-docker-full:
	$(MAKE) up-api-test && $(MAKE) wait-api && $(MAKE) test-docker

# Create dirs for volume mounts (e.g. CI)
ci-dirs:
	mkdir -p .appdata/app .appdata/postgres .appdata/integrationtests

down:
	docker compose down

# Logging and status
logs:
	docker compose logs -f

ps:
	docker compose ps

# Cleaning commands
clean:
	docker compose down --rmi local

clean-all:
	docker compose down --rmi all
	docker system prune -af --volumes

# Helper commands
restart: down up

# uv dependency management (run from host)
lock:
	uv lock

sync:
	uv sync

run:
	uv run uvicorn app.main:app --reload --port 9000

# Run integration tests (API must be up; use uv)
test:
	uv run python -m pytest tests/ -v --tb=short

# Lint and auto-fix what ruff can fix
lint-fix:
	uv run ruff check app tests alembic --fix
	uv run ruff format app tests alembic
