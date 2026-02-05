## Points

- Design Model and establish relationships between Person and Movies
- A Movie can have multiple Persons asscociated with it
- Each person can have a role. Role could be a director, actor. Sometimes a person can have more than one role also

## Database

- Movies (Contains movie info)
- Persons (Contains person info)
- Roles (Contains different roles)
- MoviePersons (Contains relationships between Movie, Person - Role)

## APIs

- Movies
  - CRUD
  - Add Persons
  - Search API (Search based on Genre, Director, Release Year, Actor)
- Persons
  - CRUD
  - Search API (Search based on Movie, Genres)
- Roles
  - CRUD
