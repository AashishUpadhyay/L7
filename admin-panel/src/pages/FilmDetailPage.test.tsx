import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { FilmDetailPage } from './FilmDetailPage'
import * as moviesApi from '@/api/movies'
import * as personsApi from '@/api/persons'

vi.mock('@/api/movies', () => ({
  getMovie: vi.fn(),
  deleteMovie: vi.fn(),
  getMoviePersons: vi.fn(),
  addPersonsToMovie: vi.fn(),
  removePersonFromMovie: vi.fn(),
}))

vi.mock('@/api/persons', () => ({
  listPersons: vi.fn(),
  createPerson: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderWithRouter(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/film/${id}`]}>
      <Routes>
        <Route path="/film/:id" element={<FilmDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('FilmDetailPage', () => {
  const movie = {
    id: 1,
    title: 'Inception',
    description: 'A mind-bending thriller',
    release_date: '2010-07-16',
    genres: [3, 5],
    rating: 8.8,
    image_path: null,
    created_at: '2010-01-01T00:00:00Z',
    updated_at: '2010-01-02T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(moviesApi.getMovie).mockResolvedValue(movie)
    vi.mocked(personsApi.listPersons).mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
    })
    vi.mocked(moviesApi.getMoviePersons).mockResolvedValue([])
  })

  it('shows loading then film details', async () => {
    renderWithRouter('1')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument()
    })
    expect(screen.getByText('A mind-bending thriller')).toBeInTheDocument()
    expect(screen.getByText('2010-07-16')).toBeInTheDocument()
    expect(screen.getByText('Drama, SciFi')).toBeInTheDocument()
    expect(screen.getByText('8.8')).toBeInTheDocument()
  })

  it('renders breadcrumbs with Home, Film, and title', async () => {
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Film' })).toHaveAttribute('href', '/film')
  })

  it('shows error when getMovie fails', async () => {
    vi.mocked(moviesApi.getMovie).mockRejectedValue(new Error('Not found'))
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeInTheDocument()
    })
  })

  it('opens edit modal when Edit is clicked', async () => {
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit film' })).toBeInTheDocument()
    })
  })

  it('opens delete confirm modal when Delete is clicked', async () => {
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Inception' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete film?' })).toBeInTheDocument()
      expect(screen.getByText(/Delete "Inception"\?/)).toBeInTheDocument()
    })
  })

  it('calls deleteMovie and navigates on confirm delete', async () => {
    vi.mocked(moviesApi.deleteMovie).mockResolvedValue(undefined)
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'Delete' })
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })
    const buttons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => {
      expect(moviesApi.deleteMovie).toHaveBeenCalledWith(1)
      expect(mockNavigate).toHaveBeenCalledWith('/film')
    })
  })
})
