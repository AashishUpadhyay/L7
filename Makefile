.PHONY: build up down clean clean-all logs ps restart lock sync run test

# Build and run commands
build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

# Logging and status
logs:
	docker-compose logs -f

ps:
	docker-compose ps

# Cleaning commands
clean:
	docker-compose down --rmi local

clean-all:
	docker-compose down --rmi all
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
