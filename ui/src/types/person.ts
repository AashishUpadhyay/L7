export interface Person {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
  movie_count?: number // Optional field for list views
}

export interface PersonCreate {
  name: string
  email: string
}

export interface PersonUpdate {
  name?: string
  email?: string
}

export interface PersonListResponse {
  items: Person[]
  total: number
  skip: number
  limit: number
}

import type { MovieRole } from './moviePerson'

export interface PersonSearchRequest {
  search?: string
  movie_ids?: number[]
  genres?: number[]
  roles?: MovieRole[]
  skip?: number
  limit?: number
}
