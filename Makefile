.PHONY: build-frontend buildup-frontend build-backend buildup-backend buildup-it build-all buildup-all
.PHONY: up down clean clean-all logs ps restart
.PHONY: lint lint-fix test-ui test wait-api
.PHONY: lock sync run ci-dirs

# Enable Docker BuildKit for better caching and performance
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# ============================================================================
# PRIMARY BUILD COMMANDS
# ============================================================================

# Frontend (ui)
build-frontend: test-ui
	docker compose build ui

buildup-frontend:
	docker compose build ui
	docker compose up -d ui

# Backend (API + DB)
build-backend: lint
	docker compose build imdb-api

buildup-backend:
	docker compose build imdb-api
	docker compose up -d imdb-db imdb-api

# Integration Tests (full cycle: build, start, test, teardown)
buildup-it:
	docker compose build imdb-api-test imdb-integration-tests
	docker compose up -d imdb-db-test imdb-api-test
	$(MAKE) wait-api
	docker compose run --rm imdb-integration-tests
	docker compose stop imdb-api-test imdb-db-test

# All
build-all: lint test-ui
	docker compose build

buildup-all:
	docker compose build
	docker compose up -d

# ============================================================================
# TESTING COMMANDS
# ============================================================================

# Lint backend code (run before backend builds)
lint:
	uv run ruff check app tests alembic
	uv run ruff format --check app tests alembic

lint-fix:
	uv run ruff check app tests alembic --fix
	uv run ruff format app tests alembic

# Run frontend UI tests (Vitest)
test-ui:
	cd ui && npm ci && npm run test:run

# Run integration tests locally (requires backend running)
test:
	uv run python -m pytest tests/ -v --tb=short

# Wait for test API health (used in buildup-it)
wait-api:
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30; do \
	  if curl -sf http://localhost:9001/health > /dev/null; then echo "API ready"; exit 0; fi; \
	  echo "Waiting for API... ($$i/30)"; sleep 2; \
	done; echo "API did not become ready"; exit 1

# ============================================================================
# DOCKER MANAGEMENT
# ============================================================================

up:
	docker compose up -d

down:
	docker compose down

restart: down up

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down --rmi local

clean-all:
	docker compose down --rmi all
	docker system prune -af --volumes

# ============================================================================
# DEVELOPMENT HELPERS
# ============================================================================

# Python dependency management (uv)
lock:
	uv lock

sync:
	uv sync

# Run API locally without Docker
run:
	uv run uvicorn app.main:app --reload --port 9000

# Create volume mount directories (for CI)
ci-dirs:
	mkdir -p .appdata/app .appdata/postgres .appdata/integrationtests .appdata/uploads .appdata/uploads-test
