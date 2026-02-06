import { PersonInMovie } from './moviePerson'

export interface Movie {
  id: number
  title: string
  description: string | null
  release_date: string | null
  genres: number[]
  rating: number | null
  image_path: string | null
  created_at: string
  updated_at: string
  persons?: PersonInMovie[] // Optional field for expanded views
}

export interface MovieCreate {
  title: string
  description?: string | null
  release_date?: string | null
  genres: number[]
  rating?: number | null
}

export interface MovieUpdate {
  title?: string
  description?: string | null
  release_date?: string | null
  genres?: number[]
  rating?: number | null
}

export interface MovieListResponse {
  items: Movie[]
  total: number
  skip: number
  limit: number
}

export interface MovieSearchRequest {
  title?: string
  genres?: number[]
  release_year?: number
  director_id?: number
  actor_ids?: number[]
  skip?: number
  limit?: number
}

export const GENRES: { value: number; label: string }[] = [
  { value: 1, label: 'Action' },
  { value: 2, label: 'Comedy' },
  { value: 3, label: 'Drama' },
  { value: 4, label: 'Horror' },
  { value: 5, label: 'SciFi' },
  { value: 6, label: 'Thriller' },
  { value: 7, label: 'Fantasy' },
  { value: 8, label: 'Romance' },
  { value: 9, label: 'Animation' },
  { value: 10, label: 'Adventure' },
  { value: 11, label: 'Family' },
  { value: 12, label: 'Mystery' },
  { value: 13, label: 'War' },
  { value: 14, label: 'Western' },
  { value: 15, label: 'Crime' },
  { value: 16, label: 'Documentary' },
  { value: 17, label: 'Biography' },
  { value: 18, label: 'History' },
]
