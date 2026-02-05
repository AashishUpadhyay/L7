FROM python:3.12-slim-bookworm

# curl needed for waiting on API health in CMD
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ADD https://astral.sh/uv/0.5.13/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh
ENV PATH="/root/.local/bin/:$PATH"

WORKDIR /app

# Copy files needed for uv sync (package build needs readme + app)
COPY pyproject.toml uv.lock Notes.md ./
COPY app ./app
# Install all dependencies including dev (pytest, httpx)
RUN uv sync

COPY . .

# Wait for API health then run pytest; exit with pytest's code so Docker reports pass/fail
# JUnit XML written to mounted volume for CI / host access
CMD ["sh", "-c", " \
  until curl -sf \"http://${API_HOST}:${API_PORT}/health\"; do echo 'Waiting for API...'; sleep 2; done && \
  uv run pytest tests/ -v --tb=short --junitxml=/app/data/junit.xml \
"]
