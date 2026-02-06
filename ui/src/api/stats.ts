import { request } from './client'

export interface Stats {
  total_movies: number
  total_professionals: number
}

export async function getStats(): Promise<Stats> {
  return request<Stats>('/admin/stats')
}
