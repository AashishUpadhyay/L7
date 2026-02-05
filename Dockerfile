FROM python:3.12-slim-bookworm

# The installer requires curl (and certificates) to download the release archive
# Keep curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Download the latest installer
ADD https://astral.sh/uv/0.5.13/install.sh /uv-installer.sh

# Run the installer then remove it
RUN sh /uv-installer.sh && rm /uv-installer.sh

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
