#!/bin/bash
set -euo pipefail

echo "Waiting for Postgres..."
uv run python - <<'PY'
import os, time
import psycopg2

host = os.getenv("DB_HOST", "localhost")
port = int(os.getenv("DB_PORT", "5432"))
user = os.getenv("DB_USER", "postgres")
password = os.getenv("DB_PASSWORD", "postgres")
dbname = os.getenv("DB_NAME", "postgres")

deadline = time.time() + 60
while True:
    try:
        conn = psycopg2.connect(
            host=host, port=port, user=user, password=password, dbname=dbname
        )
        conn.close()
        break
    except Exception as e:
        if time.time() > deadline:
            raise SystemExit(f"Postgres not ready in time: {e}") from e
        time.sleep(1)
PY

echo "Running migrations..."
cd /app && uv run alembic -c /app/alembic.ini upgrade head

echo "Starting API..."
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 9000
