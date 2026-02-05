import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routers import movies, persons
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
    ],
)

app.include_router(movies.router)
app.include_router(persons.router)


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


@app.get("/health", tags=["health"])
def health() -> dict:
    """Liveness check. Returns 200 when the API is up."""
    return {"status": "ok"}
