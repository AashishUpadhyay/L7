from fastapi import FastAPI

from app.api.routers import movies, persons

app = FastAPI(title="IMDB API", version="0.1.0")

app.include_router(movies.router)
app.include_router(persons.router)


@app.get("/health")
def health():
    return {"status": "ok"}
