from enum import Enum


class MovieRole(str, Enum):
    """Role of a person in a movie."""

    Actor = "Actor"
    Director = "Director"
    Producer = "Producer"
