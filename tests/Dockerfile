FROM python:3.12-slim-bookworm

# curl needed for waiting on API health in CMD; use curl for uv installer (avoids broken ADD URL)
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
  rm -rf /var/lib/apt/lists/* && \
  curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin/:$PATH"

WORKDIR /app

# Only what’s needed to install deps and run tests (no admin-panel, docs, etc.)
# README.md is required: pyproject.toml has readme = "README.md" and hatchling needs it to build the package.
COPY pyproject.toml uv.lock README.md ./
COPY app ./app
COPY tests ./tests
RUN uv sync

# Wait for API health then run pytest; exit with pytest's code so Docker reports pass/fail
# JUnit XML written to mounted volume for CI / host access
CMD ["sh", "-c", " \
  until curl -sf \"http://${API_HOST}:${API_PORT}/health\"; do echo 'Waiting for API...'; sleep 2; done && \
  uv run pytest tests/ -v --tb=short --junitxml=/app/data/junit.xml \
  "]
