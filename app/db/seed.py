"""Seed the database from app/db/data.json on first run (when no movies exist)."""

from __future__ import annotations

import json
import os
import random
import re
import shutil
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.genre import Genre
from app.db.models.movie_genre import MovieGenre
from app.db.models.movie_person import MoviePerson
from app.db.models.movies import Movie
from app.db.models.person import Person
from app.db.models.review import Review
from app.db.models.role import MovieRole
from app.db.session import SessionLocal

# Map JSON genre strings to Genre enum (primary mapping; compound genres map to one).
GENRE_MAP: dict[str, Genre] = {
    "action": Genre.Action,
    "comedy": Genre.Comedy,
    "drama": Genre.Drama,
    "horror": Genre.Horror,
    "sci-fi": Genre.SciFi,
    "science fiction": Genre.SciFi,
    "thriller": Genre.Thriller,
    "fantasy": Genre.Fantasy,
    "romance": Genre.Romance,
    "animation": Genre.Animation,
    "adventure": Genre.Adventure,
    "family": Genre.Family,
    "mystery": Genre.Mystery,
    "war": Genre.War,
    "western": Genre.Western,
    "crime": Genre.Crime,
    "documentary": Genre.Documentary,
    "biography": Genre.Biography,
    "history": Genre.History,
    # Compound / variants
    "crime thriller": Genre.Thriller,
    "war drama": Genre.Drama,
    "music drama": Genre.Drama,
    "psychological thriller": Genre.Thriller,
    "disaster": Genre.Drama,
    "spy thriller": Genre.Thriller,
    "political drama": Genre.Drama,
    "sci-fi thriller": Genre.SciFi,
    "survival": Genre.Adventure,
    "crime drama": Genre.Crime,
    "historical drama": Genre.History,
    "survival thriller": Genre.Thriller,
    "political thriller": Genre.Thriller,
    "tech thriller": Genre.Thriller,
    "action drama": Genre.Action,
    "sci-fi drama": Genre.SciFi,
    "action thriller": Genre.Action,
    "sci-fi horror": Genre.Horror,
    "disaster thriller": Genre.Thriller,
    "mystery thriller": Genre.Thriller,
    "mystery drama": Genre.Mystery,
    "legal drama": Genre.Drama,
    "psychological drama": Genre.Drama,
    "cyberpunk": Genre.SciFi,
}


def _normalize_genre(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())


def _parse_genre(raw: str) -> Genre:
    key = _normalize_genre(raw)
    if key in GENRE_MAP:
        return GENRE_MAP[key]
    # Try first word only
    first = key.split()[0] if key else ""
    return GENRE_MAP.get(first, Genre.Drama)


def _person_email(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", ".", name.strip().lower()).strip(".")
    return f"{slug}@seed.example.com"


def _get_or_create_person(db: Session, name: str) -> Person:
    person = db.execute(select(Person).where(Person.name == name)).scalars().one_or_none()
    if person:
        return person
    email = _person_email(name)
    # Ensure email is unique (same name can appear with different casing)
    existing = db.execute(select(Person).where(Person.email == email)).scalars().one_or_none()
    if existing:
        return existing
    person = Person(name=name, email=email)
    db.add(person)
    db.flush()
    return person


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value.strip()[:10], "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def run_seed(data_path: Path | None = None) -> bool:
    """
    Load data.json and seed the database if it has no movies.
    Returns True if seeding was performed, False if skipped (DB already has data).
    """
    if data_path is None:
        data_path = Path(__file__).resolve().parent / "data.json"
    if not data_path.exists():
        return False

    # Load ratings and reviews data
    ratings_path = Path(__file__).resolve().parent / "ratings.json"
    reviews_path = Path(__file__).resolve().parent / "reviews.json"

    ratings_data = []
    reviews_data = []

    if ratings_path.exists():
        with open(ratings_path, encoding="utf-8") as f:
            ratings_data = json.load(f)

    if reviews_path.exists():
        with open(reviews_path, encoding="utf-8") as f:
            reviews_data = json.load(f)

    # Get uploads directory from environment or default
    uploads_dir = Path(os.getenv("STORAGE_LOCAL_PATH", "./uploads"))
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Copy seed images from app/db/images to uploads directory
    images_dir = Path(__file__).resolve().parent / "images"
    available_images: list[str] = []
    if images_dir.exists() and images_dir.is_dir():
        seed_images_subdir = uploads_dir / "seed"
        seed_images_subdir.mkdir(parents=True, exist_ok=True)

        for img in images_dir.iterdir():
            if img.is_file() and img.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".webp"}:
                dest_path = seed_images_subdir / img.name
                if not dest_path.exists():
                    shutil.copy2(img, dest_path)
                # Store relative path for database (relative to uploads directory)
                available_images.append(f"seed/{img.name}")

    db = SessionLocal()
    try:
        existing = db.execute(select(Movie).limit(1)).scalars().one_or_none()
        if existing is not None:
            return False

        with open(data_path, encoding="utf-8") as f:
            rows = json.load(f)

        if not rows:
            return False

        # List of reviewer names for seeding
        reviewer_names = [
            "Alex Johnson",
            "Maria Garcia",
            "David Chen",
            "Sarah Williams",
            "Michael Brown",
            "Emily Davis",
            "James Wilson",
            "Jessica Martinez",
            "Robert Anderson",
            "Linda Taylor",
            "Christopher Lee",
            "Patricia White",
            "Daniel Harris",
            "Jennifer Clark",
            "Matthew Lewis",
            "Lisa Robinson",
            "Andrew Walker",
            "Karen Hall",
            "Joshua Allen",
            "Nancy Young",
            "Ryan King",
            "Betty Wright",
            "Kevin Lopez",
            "Sandra Hill",
            "Brian Scott",
            "Carol Green",
            "Jason Adams",
            "Laura Baker",
            "Steven Nelson",
            "Dorothy Carter",
        ]

        for idx, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            title = (row.get("Title") or "").strip()
            if not title:
                continue

            release_date = _parse_date(row.get("ReleaseDate"))
            # Randomly assign an image if available
            image_path = random.choice(available_images) if available_images else None

            # Get rating from ratings.json if available
            movie_rating = None
            if idx < len(ratings_data) and isinstance(ratings_data[idx], dict):
                rating_value = ratings_data[idx].get("Rating")
                if rating_value is not None:
                    movie_rating = float(rating_value)

            movie = Movie(
                title=title,
                description=(row.get("Description") or "").strip() or None,
                release_date=release_date,
                image_path=image_path,
                rating=movie_rating,
            )
            db.add(movie)
            db.flush()

            genre_raw = row.get("Genre")
            if genre_raw:
                g = _parse_genre(genre_raw)
                db.add(MovieGenre(movie_id=movie.id, genre=g))

            actor_name = (row.get("Actor") or "").strip()
            if actor_name:
                person = _get_or_create_person(db, actor_name)
                db.add(MoviePerson(movie_id=movie.id, person_id=person.id, role=MovieRole.Actor))

            director_name = (row.get("Director") or "").strip()
            if director_name:
                person = _get_or_create_person(db, director_name)
                db.add(MoviePerson(movie_id=movie.id, person_id=person.id, role=MovieRole.Director))

            producer_name = (row.get("Producer") or "").strip()
            if producer_name:
                person = _get_or_create_person(db, producer_name)
                db.add(MoviePerson(movie_id=movie.id, person_id=person.id, role=MovieRole.Producer))

            # Add reviews for this movie (2-5 random reviews)
            if reviews_data:
                num_reviews = random.randint(2, 5)
                selected_reviews = random.sample(reviews_data, min(num_reviews, len(reviews_data)))

                for review_text in selected_reviews:
                    if not review_text or not isinstance(review_text, str):
                        continue

                    # Random rating between 5.0 and 10.0 for each review
                    review_rating = round(random.uniform(5.0, 10.0), 1)
                    reviewer_name = random.choice(reviewer_names)

                    review = Review(
                        movie_id=movie.id,
                        author_name=reviewer_name,
                        rating=review_rating,
                        content=review_text.strip(),
                    )
                    db.add(review)

        db.commit()
        return True
    finally:
        db.close()


def main() -> None:
    if run_seed():
        print("Database seeded from data.json.")
    else:
        print("Seed skipped (database already has data or data.json missing).")


if __name__ == "__main__":
    main()
