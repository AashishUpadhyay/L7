from fastapi import FastAPI

app = FastAPI(title="IMDB API", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}
