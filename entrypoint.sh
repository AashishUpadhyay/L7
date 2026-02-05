#!/bin/bash
# Start the API server
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 9000
