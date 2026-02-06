import { request } from './client'
import type {
  Person,
  PersonCreate,
  PersonUpdate,
  PersonListResponse,
  PersonSearchRequest,
} from '@/types/person'
import type { MovieInPerson } from '@/types/moviePerson'

export function listPersons(skip = 0, limit = 10) {
  return request<PersonListResponse>('/persons', { params: { skip, limit } })
}

export function searchPersons(payload: PersonSearchRequest) {
  return request<PersonListResponse>('/persons/search', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getPerson(id: number) {
  return request<Person>(`/persons/${id}`)
}

export function createPerson(payload: PersonCreate) {
  return request<Person>('/persons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updatePerson(id: number, payload: PersonUpdate) {
  return request<Person>(`/persons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deletePerson(id: number) {
  return request<void>(`/persons/${id}`, { method: 'DELETE' })
}

export function getPersonMovies(personId: number) {
  return request<MovieInPerson[]>(`/persons/${personId}/movies`)
}
