export interface Review {
  id: number
  movie_id: number
  author_name: string
  rating: number
  content: string
  created_at: string
}

export interface ReviewCreate {
  author_name: string
  rating: number
  content: string
}

export interface ReviewListResponse {
  items: Review[]
  total: number
  skip: number
  limit: number
  average_rating: number | null
}
