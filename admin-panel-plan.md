# Admin Panel – Plan (React + TypeScript)

CRUD UI for **Movies** and **Persons**, running in a **separate container**, calling the existing backend APIs.

---

## 1. High-level architecture

- **Frontend**: React 18+ with TypeScript, in its own app (e.g. `admin-panel/` or `frontend/`).
- **Backend**: Existing FastAPI app (`imdb-api`) on port **9000**.
- **Deployment**: Admin panel in its own **Docker container**; communicates with backend via API base URL (e.g. `http://imdb-api:9000` from Docker, `http://localhost:9000` when dev proxy is used).

---

## 2. Backend API summary (what the UI will use)

### 2.1 Movies

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|--------|
| List | GET | `/movies?skip=0&limit=20` | Paginated |
| Search | POST | `/movies/search` | Body: `genres`, `release_year`, `director_id`, `actor_ids`, `skip`, `limit` |
| Get one | GET | `/movies/{movie_id}` | |
| Create | POST | `/movies` | Body: `title`, `description`, `release_date`, `genres` (min 1), `rating` |
| Update | PATCH | `/movies/{movie_id}` | Partial; same fields as create |
| Delete | DELETE | `/movies/{movie_id}` | 204 No Content |
| Add persons | POST | `/movies/{movie_id}/persons` | Body: `[{ person_id, role }]`; roles: Actor, Director, Producer |

**Movie response**: `id`, `title`, `description`, `release_date`, `genres` (list of Genre enum values 1–18), `rating`, `created_at`, `updated_at`.

**Genres** (backend enum): Action(1), Comedy(2), Drama(3), Horror(4), SciFi(5), Thriller(6), Fantasy(7), Romance(8), Animation(9), Adventure(10), Family(11), Mystery(12), War(13), Western(14), Crime(15), Documentary(16), Biography(17), History(18).

### 2.2 Persons

| Operation | Method | Endpoint | Notes |
|-----------|--------|----------|--------|
| List | GET | `/persons?skip=0&limit=20` | Paginated |
| Search | POST | `/persons/search` | Body: `movie_ids`, `genres`, `skip`, `limit` |
| Get one | GET | `/persons/{person_id}` | |
| Create | POST | `/persons` | Body: `name`, `email` (unique) |
| Update | PATCH | `/persons/{person_id}` | Partial |
| Delete | DELETE | `/persons/{person_id}` | 204 No Content |

**Person response**: `id`, `name`, `email`, `created_at`, `updated_at`.

---

## 3. Tech stack (recommended)

| Area | Choice | Rationale |
|------|--------|-----------|
| Framework | React 18 | Matches “React” requirement |
| Language | TypeScript | Matches “TypeScript” requirement |
| Build | Vite | Fast, simple, good TS support |
| Routing | React Router v6 | SPA with list/detail/create/edit routes |
| HTTP client | fetch or Axios | Typed wrappers around backend endpoints |
| State | React state + (optional) React Query/TanStack Query | Server state (lists, single resource) and cache; local UI state in component state |
| Forms | React Hook Form + Zod (or similar) | Validation aligned with backend schemas |
| UI / styling | Tailwind CSS or MUI / Chakra | Rapid layout and forms; choose one and stay consistent |
| Table / list | TanStack Table or simple table + pagination | Sort/filter can be done on client or via search APIs |

---

## 4. Project structure (suggested)

```
admin-panel/                    # or frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── client.ts           # base URL, fetch/axios instance
│   │   ├── movies.ts           # list, get, create, update, delete, addPersons
│   │   └── persons.ts          # list, get, create, update, delete, search
│   ├── types/
│   │   ├── movie.ts            # Movie, MovieCreate, MovieUpdate, Genre, etc.
│   │   └── person.ts           # Person, PersonCreate, PersonUpdate
│   ├── components/
│   │   ├── layout/             # App shell, sidebar, header
│   │   ├── movies/             # MovieList, MovieForm, MovieDetail, etc.
│   │   └── persons/            # PersonList, PersonForm, PersonDetail, etc.
│   ├── pages/ or routes/
│   │   ├── MoviesPage.tsx
│   │   ├── MovieDetailPage.tsx
│   │   ├── PersonsPage.tsx
│   │   └── PersonDetailPage.tsx
│   ├── hooks/                  # useMovies, usePersons, useMovie, usePerson (optional)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── Dockerfile
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Backend stays in existing `app/`, `tests/`, etc.; no change to backend structure.

---

## 5. UI structure (reference: image.png)

Layout matches the reference: **dark left sidebar**, **light blue top header**, **light main content** with breadcrumbs, action bar, data table, and pagination.

### 5.1 Left sidebar (dark theme)

- **Branding** at top: e.g. "IMDB Admin Panel" (replace "ORIGINAL - CRUD - Admin Panel").
- **Collapsible sections** (arrows to expand/collapse). For this app we use:
  - **INVENTORY** (expanded by default), containing:
    - **Film** (film icon) → Movies list/detail.
    - **Actor** (camera icon) → Persons list/detail. *(Our "persons" map to "Actor" in the reference.)*
  - Optionally a **Film actor** (or "Movie – Person") section later for linking persons to movies.
- **Sidebar close** control (e.g. X or collapse icon) top-right of sidebar.

### 5.2 Top header bar (light blue)

- **Hamburger** (left): toggles sidebar visibility.
- **Title**: e.g. "IMDB Admin" with subtitle "Admin dashboard".
- **Right side**: placeholder user (e.g. "Admin User") and optional icons (theme, fullscreen). No real auth required for the plan.

### 5.3 Main content area (light background)

**Breadcrumbs**  
- Format: `Home / [Entity]` (e.g. `Home / Actor`, `Home / Film`). Optional: `Home / Film / [Movie title]` for detail.

**Action bar** (below breadcrumbs, one row)

- **ADD NEW**: Primary (blue) button with "+" icon → opens create form or navigates to create route.
- **EXPORT**: Secondary (grey) button with upload icon and dropdown; can offer CSV/JSON export of current list (client-side or future API).
- **Search**: Filter icon + text input (e.g. "Search by name" for Persons, "Search by title" for Movies) + magnifying-glass button. Wire to list API or search API (POST `/persons/search`, POST `/movies/search`).
- **Results per page**: Label "Results" + dropdown (e.g. 10, 20, 50) controlling `limit`; updates list and pagination.

**Data table**

- **Header row** (dark grey): Checkbox (bulk select), **Action**, then entity columns. Sort indicators (up/down arrows) on sortable columns.
- **Columns**
  - **Persons (Actor)**: Action, Person id, Name, Email, Last update. *(Our API has single `name` and `email`, not first/last name.)*
  - **Movies (Film)**: Action, Film id, Title, Description (truncated), Release date, Genres, Rating, Last update.
- **Action column** per row: View (blue eye), Edit (yellow pencil), Delete (red cross). Optional: "Show >" link for related data (e.g. films for a person, persons for a movie).
- **Rows**: Alternating row background (light grey / white). Checkbox per row for bulk actions (e.g. bulk delete if we add it later).

**Pagination** (bottom)

- "Page" + page numbers (1, 2, 3, …). Current page highlighted (e.g. blue).
- Next (`>`) and last page (`>>`) controls.
- Text: "Results 1 to 10 of 201" (from API `total`, `skip`, `limit`).

### 5.4 Forms (Create / Edit)

- **Modal or dedicated page** for Create and Edit.
- **Persons**: Name, Email. Buttons: Save, Cancel.
- **Movies**: Title, Description, Release date, Genres (multi-select from enum), Rating. Buttons: Save, Cancel.
- **Movie detail**: Optional section to add persons to movie (person + role: Actor/Director/Producer) with "Show >" or inline list.

### 5.5 Shared behavior

- **Delete**: Confirm dialog before calling DELETE; then refresh list.
- **Errors**: Show API errors (4xx/5xx) in toast or inline message.
- **Loading**: Skeleton or spinner for table and forms.
- **Empty state**: Message when list has no results.

---

## 6. Environment and API base URL

- **Dev**: e.g. `VITE_API_BASE_URL=http://localhost:9000` so the Vite app talks to the backend on the host. (CORS must allow the dev origin on the FastAPI app.)
- **Docker**: `VITE_API_BASE_URL=http://imdb-api:9000` (or `http://<backend-service>:9000`) when the admin panel runs inside Docker and backend is another service. Browser still calls the backend; if the browser runs on the host, use a URL the browser can reach (e.g. `http://localhost:9000`) and ensure backend is exposed and CORS allows that origin.

So:

- In **docker-compose**, the admin panel service will have `VITE_API_BASE_URL` set to the URL the **browser** will use to reach the API (often `http://localhost:9000` when backend is mapped to 9000).
- Backend must allow the admin panel origin in CORS (e.g. `http://localhost:5173` for Vite dev, and the production admin URL if different).

---

## 7. Docker

- **Dockerfile**: Multi-stage build (e.g. Node to build, nginx or a minimal static server to serve the built app).
- **docker-compose**: Add a service, e.g. `admin-panel`, that builds from `admin-panel/Dockerfile`, exposes a port (e.g. 3000 or 80), and sets `VITE_API_BASE_URL` at build time or runtime (depending on how Vite is used). The admin panel does not need to “see” the DB; it only calls the API.

Example (conceptual):

```yaml
admin-panel:
  build: ./admin-panel
  ports:
    - "3000:80"
  environment:
    - VITE_API_BASE_URL=http://localhost:9000   # or the URL the browser uses
  depends_on:
    - imdb-api
```

---

## 8. Implementation order (phases)

1. **Scaffold**: Create `admin-panel` with Vite + React + TypeScript, add Tailwind (or chosen UI lib), React Router, and one “Hello” page.
2. **API layer**: Define `types` from backend (Movie, Person, Genre, etc.), create `api/client` and `api/movies` + `api/persons` with typed functions for all endpoints above.
3. **Layout**: Shell with navigation to Movies and Persons.
4. **Persons CRUD**: List (with pagination), Create form, Detail/Edit form, Delete with confirmation. Optional: search.
5. **Movies CRUD**: List (with pagination), Create form (with genre multi-select and date), Detail/Edit, Delete. Optional: search/filters.
6. **Movie–Person link**: On movie detail/edit, section to add persons with role (Actor/Director/Producer) via `POST /movies/{id}/persons`.
7. **Polish**: Error handling, loading states, CORS check, env for API URL.
8. **Docker**: Dockerfile + docker-compose service; verify with backend running in Docker.

---

## 9. Backend CORS (if not already present)

Ensure FastAPI allows the admin panel origin, e.g.:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # adjust as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 10. Reference image

**image.png** is the visual reference: dark sidebar with INVENTORY (Film, Actor), light blue header, main area with breadcrumbs, ADD NEW / EXPORT / search / results-per-page, sortable table with Action (view/edit/delete) and pagination. Section 5 above translates this into concrete components and columns for Movies and Persons.

---

## Summary

| Item | Decision |
|------|----------|
| App | React + TypeScript, separate repo/folder (e.g. `admin-panel/`) |
| Build | Vite |
| Backend | Existing FastAPI; no backend code change except possibly CORS |
| Run | Separate container; env var for API base URL |
| Features | Movies CRUD + add persons to movie; Persons CRUD; list + search + pagination |
| UI reference | image.png: dark sidebar, blue header, table + pagination + CRUD actions |
| Entities | Film → Movies, Actor → Persons; table columns and forms as in Section 5 |
| Next | Implement in the order of Section 8, matching the layout in Section 5 |
