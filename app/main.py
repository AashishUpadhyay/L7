from fastapi import FastAPI

from app.api.routers import movies

app = FastAPI(title="IMDB API", version="0.1.0")

app.include_router(movies.router)


@app.get("/health")
def health():
    return {"status": "ok"}
