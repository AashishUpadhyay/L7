from enum import StrEnum


class MovieRole(StrEnum):
    """Role of a person in a movie."""

    Actor = "Actor"
    Director = "Director"
    Producer = "Producer"
