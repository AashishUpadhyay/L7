export interface Person {
  id: number
  name: string
  email: string
  created_at: string
  updated_at: string
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

export interface PersonSearchRequest {
  movie_ids?: number[]
  genres?: number[]
  skip?: number
  limit?: number
}
