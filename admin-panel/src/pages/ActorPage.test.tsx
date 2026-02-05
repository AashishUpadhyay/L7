import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ActorPage } from './ActorPage'
import * as personsApi from '@/api/persons'

vi.mock('@/api/persons', () => ({
  listPersons: vi.fn(),
  searchPersons: vi.fn(),
  deletePerson: vi.fn(),
  getPersonMovies: vi.fn(),
}))

vi.mock('@/hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ActorPage />
    </MemoryRouter>
  )
}

describe('ActorPage', () => {
  const mockPersons = {
    items: [
      {
        id: 1,
        name: 'Jane Doe',
        email: 'jane@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        movie_count: 2,
      },
    ],
    total: 1,
    skip: 0,
    limit: 10,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(personsApi.listPersons).mockResolvedValue(mockPersons)
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue([])
  })

  it('shows loading then table with actors', async () => {
    renderPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeInTheDocument()
      expect(screen.getByText('Doe')).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: 'First name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Last name' })).toBeInTheDocument()
  })

  it('renders breadcrumb and ADD NEW button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/professionals')
    expect(screen.getByRole('button', { name: /ADD NEW/i })).toBeInTheDocument()
  })

  it('opens add modal when ADD NEW is clicked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ADD NEW/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /ADD NEW/i }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Add new actor' })).toBeInTheDocument()
    })
  })

  it('shows error when list fails', async () => {
    vi.mocked(personsApi.listPersons).mockRejectedValue(new Error('Server error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows No results when list is empty', async () => {
    vi.mocked(personsApi.listPersons).mockResolvedValue({
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
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit actor' })).toBeInTheDocument()
    })
  })

  it('opens delete confirm when Delete is clicked on a row', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete professional?' })).toBeInTheDocument()
      expect(screen.getByText(/Delete Jane Doe\?/)).toBeInTheDocument()
    })
  })

  it('calls searchPersons when search has value', async () => {
    vi.mocked(personsApi.searchPersons).mockResolvedValue(mockPersons)
    renderPage()
    await waitFor(() => {
      expect(personsApi.listPersons).toHaveBeenCalled()
    })
    fireEvent.change(screen.getByPlaceholderText('Search by name or email'), {
      target: { value: 'jane' },
    })
    await waitFor(
      () => {
        expect(personsApi.searchPersons).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'jane' })
        )
      },
      { timeout: 1000 }
    )
  })

  it('renders Movies column with count', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Jane')).toBeInTheDocument()
    })
    expect(screen.getByRole('columnheader', { name: 'Movies' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2 movies' })).toBeInTheDocument()
  })

  it('shows "0 movies" when person has no movies', async () => {
    vi.mocked(personsApi.listPersons).mockResolvedValue({
      items: [
        {
          id: 2,
          name: 'John Smith',
          email: 'john@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          movie_count: 0,
        },
      ],
      total: 1,
      skip: 0,
      limit: 10,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument()
    })
    expect(screen.getByText('0 movies')).toBeInTheDocument()
  })

  it('opens movies modal when movie count is clicked', async () => {
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue([
      { id: 1, movie_id: 1, movie_title: 'Inception', role: 'Actor' },
      { id: 2, movie_id: 2, movie_title: 'Titanic', role: 'Director' },
    ])
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2 movies' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '2 movies' }))

    await waitFor(() => {
      expect(personsApi.getPersonMovies).toHaveBeenCalledWith(1)
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Movies for Jane Doe' })).toBeInTheDocument()
      expect(screen.getByText('Inception')).toBeInTheDocument()
      expect(screen.getByText('Titanic')).toBeInTheDocument()
      expect(screen.getByText('(Actor)')).toBeInTheDocument()
      expect(screen.getByText('(Director)')).toBeInTheDocument()
    })
  })

  it('shows Close button in movies modal', async () => {
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2 movies' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '2 movies' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })
  })

  it('closes movies modal when Close is clicked', async () => {
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue([
      { id: 1, movie_id: 1, movie_title: 'Inception', role: 'Actor' },
    ])
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2 movies' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: '2 movies' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Movies for Jane Doe' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Movies for Jane Doe' })).not.toBeInTheDocument()
    })
  })
})
