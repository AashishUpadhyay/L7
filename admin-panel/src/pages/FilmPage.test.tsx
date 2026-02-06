import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FilmPage } from './FilmPage'
import * as moviesApi from '@/api/movies'
import * as personsApi from '@/api/persons'

vi.mock('@/api/movies', () => ({
  listMovies: vi.fn(),
  searchMovies: vi.fn(),
  deleteMovie: vi.fn(),
  getMoviePersons: vi.fn(),
  addPersonsToMovie: vi.fn(),
  removePersonFromMovie: vi.fn(),
}))

vi.mock('@/api/persons', () => ({
  listPersons: vi.fn(),
  createPerson: vi.fn(),
}))

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <FilmPage />
    </MemoryRouter>
  )
}

describe('FilmPage', () => {
  const mockMovies = {
    items: [
      {
        id: 1,
        title: 'Inception',
        description: 'A mind-bending film',
        release_date: '2010-07-16',
        genres: [3, 5],
        rating: 8.8,
        image_path: null,
        created_at: '2010-01-01T00:00:00Z',
        updated_at: '2010-01-02T00:00:00Z',
      },
    ],
    total: 1,
    skip: 0,
    limit: 10,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(moviesApi.listMovies).mockResolvedValue(mockMovies)
    vi.mocked(moviesApi.getMoviePersons).mockResolvedValue([])
    vi.mocked(personsApi.listPersons).mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 100,
    })
  })

  it('shows loading then table with films', async () => {
    renderPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: 'Title' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Release date' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Genres' })).toBeInTheDocument()
    expect(screen.getByText('A mind-bending film')).toBeInTheDocument()
  })

  it('renders breadcrumb and ADD NEW button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/film')
    expect(screen.getByRole('button', { name: /ADD NEW/i })).toBeInTheDocument()
  })

  it('opens add modal when ADD NEW is clicked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ADD NEW/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /ADD NEW/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add new film' })).toBeInTheDocument()
    })
  })

  it('shows error when list fails', async () => {
    vi.mocked(moviesApi.listMovies).mockRejectedValue(new Error('Network error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('shows No results when list is empty', async () => {
    vi.mocked(moviesApi.listMovies).mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 10,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument()
    })
  })

  it('opens edit modal when Edit is clicked on a row', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit film' })).toBeInTheDocument()
    })
  })

  it('opens delete confirm when Delete is clicked on a row', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete film?' })).toBeInTheDocument()
      expect(screen.getByText(/Delete "Inception"\?/)).toBeInTheDocument()
    })
  })

  it('calls searchMovies when search has value', async () => {
    vi.mocked(moviesApi.searchMovies).mockResolvedValue(mockMovies)
    renderPage()
    await waitFor(() => {
      expect(moviesApi.listMovies).toHaveBeenCalled()
    })
    fireEvent.change(screen.getByPlaceholderText('Search by title or description'), {
      target: { value: 'inception' },
    })
    await waitFor(
      () => {
        expect(moviesApi.searchMovies).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'inception' })
        )
      },
      { timeout: 1000 }
    )
  })

  describe('expandable rows (people in movie)', () => {
    it('has expand button for each movie row', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Inception')).toBeInTheDocument()
      })
      const expandButtons = screen.getAllByRole('button', { name: 'Expand' })
      expect(expandButtons.length).toBe(1)
    })

    it('calls getMoviePersons and shows loading then content when expand clicked', async () => {
      const mockPersons = [
        {
          id: 1,
          person_id: 10,
          person_name: 'Leonardo DiCaprio',
          person_email: 'leo@example.com',
          role: 'Actor' as const,
        },
      ]
      vi.mocked(moviesApi.getMoviePersons).mockResolvedValue(mockPersons)
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Inception')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Expand' }))

      await waitFor(() => {
        expect(moviesApi.getMoviePersons).toHaveBeenCalledWith(1)
      })
      await waitFor(() => {
        expect(screen.getByText('People in this movie:')).toBeInTheDocument()
        expect(screen.getByText('Leonardo DiCaprio')).toBeInTheDocument()
        expect(screen.getByText('Actor')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'View Profile →' })).toBeInTheDocument()
      })
    })

    it('shows "No people assigned to this movie" when movie has no persons', async () => {
      vi.mocked(moviesApi.getMoviePersons).mockResolvedValue([])
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('Inception')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Expand' }))

      await waitFor(() => {
        expect(screen.getByText('No people assigned to this movie.')).toBeInTheDocument()
      })
    })

    it('shows Collapse button when row is expanded', async () => {
      vi.mocked(moviesApi.getMoviePersons).mockResolvedValue([])
      renderPage()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Expand' })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: 'Expand' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Collapse' })).toBeInTheDocument()
      })
    })
  })
})
