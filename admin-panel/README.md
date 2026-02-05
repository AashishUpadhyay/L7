# IMDB Admin Panel

React + TypeScript CRUD UI for Movies (Film) and Persons (Actor), matching the reference admin layout.

## Run locally (dev)

1. From repo root, start the backend (e.g. `uv run uvicorn app.main:app --host 0.0.0.0 --port 9000` or use Docker for `imdb-api`).
2. From this directory:
   - `npm install`
   - `npm run dev`
3. Open http://localhost:5173. The Vite dev server proxies `/api` to the backend (default `http://localhost:9000`).

To point at another API URL, set `VITE_API_BASE_URL` (e.g. in `.env`).

## Run with Docker

From repo root:

```bash
docker compose up -d imdb-api imdb-db admin-panel
```

Then open http://localhost:3000 for the admin panel. The built app is configured to call the API at `http://localhost:9000` (set at build time via `VITE_API_BASE_URL` in docker-compose).

## Build

```bash
npm run build
```

Output is in `dist/`.
