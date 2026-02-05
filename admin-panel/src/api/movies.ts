import { request } from './client'
import type {
  Movie,
  MovieCreate,
  MovieUpdate,
  MovieListResponse,
  MovieSearchRequest,
} from '@/types/movie'
import type {
  PersonInMovie,
  MoviePerson,
  AddPersonToMovieRequest,
  MovieRole,
} from '@/types/moviePerson'

export function listMovies(skip = 0, limit = 10) {
  return request<MovieListResponse>('/movies', { params: { skip, limit } })
}

export function searchMovies(payload: MovieSearchRequest) {
  return request<MovieListResponse>('/movies/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getMovie(id: number) {
  return request<Movie>(`/movies/${id}`)
}

export function createMovie(payload: MovieCreate) {
  return request<Movie>('/movies', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateMovie(id: number, payload: MovieUpdate) {
  return request<Movie>(`/movies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteMovie(id: number) {
  return request<void>(`/movies/${id}`, { method: 'DELETE' })
}

export function getMoviePersons(movieId: number) {
  return request<PersonInMovie[]>(`/movies/${movieId}/persons`)
}

export function addPersonsToMovie(movieId: number, payload: AddPersonToMovieRequest[]) {
  return request<MoviePerson[]>(`/movies/${movieId}/persons`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function removePersonFromMovie(movieId: number, personId: number, role?: MovieRole) {
  const params = role ? { role } : {}
  return request<void>(`/movies/${movieId}/persons/${personId}`, {
    method: 'DELETE',
    params,
  })
}

export async function uploadMovieImage(movieId: number, file: File): Promise<Movie> {
  const formData = new FormData()
  formData.append('file', file)
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const response = await fetch(`${API_BASE}/movies/${movieId}/upload-image`, {
    method: 'POST',
    body: formData,
  })
  
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    const msg = data.detail || response.statusText || 'Upload failed'
    throw new Error(msg)
  }
  
  return response.json()
}
