import { request } from './client'
import type {
  Movie,
  MovieCreate,
  MovieUpdate,
  MovieListResponse,
  MovieSearchRequest,
} from '@/types/movie'

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
