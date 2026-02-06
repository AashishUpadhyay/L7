export type MovieRole = 'Actor' | 'Director' | 'Producer'

export interface MoviePerson {
  id: number
  movie_id: number
  person_id: number
  role: MovieRole
}

export interface PersonInMovie {
  id: number // movie_person id
  person_id: number
  person_name: string
  person_email: string
  role: MovieRole
}

export interface MovieInPerson {
  id: number // movie_person id
  movie_id: number
  movie_title: string
  role: MovieRole
  image_path: string | null
  rating: number | null
  release_date: string | null
  genres: number[]
}

export interface AddPersonToMovieRequest {
  person_id: number
  role: MovieRole
}

export const MOVIE_ROLES: { value: MovieRole; label: string }[] = [
  { value: 'Actor', label: 'Actor' },
  { value: 'Director', label: 'Director' },
  { value: 'Producer', label: 'Producer' },
]
