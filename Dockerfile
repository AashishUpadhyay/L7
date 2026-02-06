FROM python:3.12-slim-bookworm

# The installer requires curl (and certificates) to download the release archive
# Keep curl for healthcheck. Use curl instead of ADD so the installer URL is not cached and works in all environments.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    curl -LsSf https://astral.sh/uv/install.sh | sh

# Ensure the installed binary is on the `PATH`
ENV PATH="/root/.local/bin/:$PATH"

COPY . /app

WORKDIR /app

# Use --frozen when uv.lock is committed (run `uv lock` locally first)
RUN uv sync --no-group dev

# Expose the port that matches docker-compose.yml
EXPOSE 9000

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
