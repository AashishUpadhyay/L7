.PHONY: build up down clean clean-all logs ps restart lock sync run test build-up up-api wait-api test-docker ci-dirs

# Build and run commands
build:
	docker compose build

# Build images then start containers (use after code changes to pick up new API/tests)
build-up: build
	docker compose up -d

up:
	docker compose up -d

# Start only API and DB (for CI or when running tests in container)
up-api:
	docker compose up -d imdb-db imdb-api

# Wait for API health (for CI). Requires API to be starting.
wait-api:
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
	  if curl -sf http://localhost:9000/health > /dev/null; then echo "API ready"; exit 0; fi; \
	  echo "Waiting for API... ($$i/30)"; sleep 2; \
	done; echo "API did not become ready"; exit 1

# Run integration tests in Docker (API must be up). Fails the build if tests fail.
test-docker:
	docker compose run --rm imdb-integration-tests

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
