import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routers import admin, movies, persons
from app.db.seed import run_seed
from app.logging_config import setup_logging

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IMDB API",
    version="0.1.0",
    description="REST API for movies and persons with roles (Actor, Director, Producer). "
    "Supports CRUD, bulk upload, and linking persons to movies.",
    openapi_tags=[
        {"name": "movies", "description": "Movie CRUD, bulk create, and add persons to movies"},
        {"name": "persons", "description": "Person CRUD and list with paging"},
        {"name": "admin", "description": "Database admin: clean, seed, reset"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(movies.router)
app.include_router(persons.router)
app.include_router(admin.router)

# Mount static files for uploaded images
uploads_dir = Path(os.getenv("STORAGE_LOCAL_PATH", "./uploads"))
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


def _log_request(request: Request) -> str:
    return f"{request.method} {request.url.path}"


@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Log HTTP exceptions as ERROR. Override to WARNING/INFO/DEBUG if needed."""
    logger.error(
        "HTTP %s %s | %s",
        exc.status_code,
        _log_request(request),
        exc.detail,
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Log validation errors (422) as ERROR. Override to WARNING/INFO/DEBUG if needed."""
    logger.error(
        "Validation error %s | body=%s",
        _log_request(request),
        exc.body,
        exc_info=False,
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Log unhandled exceptions to the log file and return 500."""
    logger.exception(
        "Unhandled exception %s | %s",
        _log_request(request),
        exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.on_event("startup")
def on_startup() -> None:
    logger.info("IMDB API starting")
    # Auto-seed database if empty
    try:
        if run_seed():
            logger.info("Database auto-seeded from data.json")
        else:
            logger.info("Database already has data, skipping auto-seed")
    except Exception as e:
        logger.warning("Auto-seed failed: %s", e)


@app.get("/health", tags=["health"])
def health() -> dict:
    """Liveness check. Returns 200 when the API is up."""
    return {"status": "ok"}
