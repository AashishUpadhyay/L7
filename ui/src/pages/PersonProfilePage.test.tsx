import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PersonProfilePage } from './PersonProfilePage'
import * as personsApi from '@/api/persons'

vi.mock('@/api/persons', () => ({
  getPerson: vi.fn(),
  getPersonMovies: vi.fn(),
}))

function renderPage(personId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/person/${personId}`]}>
      <Routes>
        <Route path="/person/:id" element={<PersonProfilePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('PersonProfilePage', () => {
  const mockPerson = {
    id: 1,
    name: 'John Actor',
    email: 'john@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  }

  const mockMovies = [
    {
      id: 1,
      movie_id: 101,
      movie_title: 'Inception',
      role: 'Actor' as const,
      image_path: '/images/inception.jpg',
      rating: 8.5,
      release_date: '2010-07-16',
      genres: [1, 5], // Action, Sci-Fi
    },
    {
      id: 2,
      movie_id: 102,
      movie_title: 'The Dark Knight',
      role: 'Actor' as const,
      image_path: null,
      rating: 9.0,
      release_date: '2008-07-18',
      genres: [1, 3], // Action, Drama
    },
    {
      id: 3,
      movie_id: 103,
      movie_title: 'Interstellar',
      role: 'Director' as const,
      image_path: '/images/interstellar.jpg',
      rating: 8.6,
      release_date: '2014-11-07',
      genres: [3, 5], // Drama, Sci-Fi
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(personsApi.getPerson).mockResolvedValue(mockPerson)
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue(mockMovies)
  })

  it('shows loading spinner initially', () => {
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('displays person name and credit count', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('John Actor')).toBeInTheDocument()
    })
    expect(screen.getByText('3 credits')).toBeInTheDocument()
  })

  it('groups movies by role', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/As Actor/)).toBeInTheDocument()
    })
    expect(screen.getByText(/As Director/)).toBeInTheDocument()
    expect(screen.getByText('(2)')).toBeInTheDocument()
    expect(screen.getByText('(1)')).toBeInTheDocument()
  })

  it('displays movie titles', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    expect(screen.getByText('The Dark Knight')).toBeInTheDocument()
    expect(screen.getByText('Interstellar')).toBeInTheDocument()
  })

  it('displays movie ratings', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('8.5')).toBeInTheDocument()
    })
    expect(screen.getByText('9.0')).toBeInTheDocument()
    expect(screen.getByText('8.6')).toBeInTheDocument()
  })

  it('shows error when person not found', async () => {
    vi.mocked(personsApi.getPerson).mockRejectedValue(new Error('Person not found'))
    renderPage('999')
    await waitFor(() => {
      expect(screen.getByText('Person not found')).toBeInTheDocument()
    })
  })

  it('shows error when API fails', async () => {
    vi.mocked(personsApi.getPerson).mockRejectedValue(new Error('Server error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows message when person has no movies', async () => {
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue([])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No movies found for this person.')).toBeInTheDocument()
    })
  })

  it('renders Back to Browse link', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Back to Browse')).toBeInTheDocument()
    })
    const link = screen.getByText('Back to Browse').closest('a')
    expect(link).toHaveAttribute('href', '/')
  })

  it('renders Watch Later link', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Watch Later')).toBeInTheDocument()
    })
    const link = screen.getByText('Watch Later').closest('a')
    expect(link).toHaveAttribute('href', '/watchlater')
  })

  it('renders movie links with correct href', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    const inceptionLink = screen.getByText('Inception').closest('a')
    expect(inceptionLink).toHaveAttribute('href', '/movie/101')
  })

  it('calls getPerson and getPersonMovies on mount', async () => {
    renderPage('42')
    await waitFor(() => {
      expect(personsApi.getPerson).toHaveBeenCalledWith(42)
    })
    expect(personsApi.getPersonMovies).toHaveBeenCalledWith(42)
  })

  it('displays person initial avatar', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('J')).toBeInTheDocument()
    })
  })

  it('displays "1 credit" when person has exactly one movie', async () => {
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue([mockMovies[0]])
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('1 credit')).toBeInTheDocument()
    })
  })

  it('displays multiple roles for same person', async () => {
    const moviesWithProducer = [
      ...mockMovies,
      {
        id: 4,
        movie_id: 104,
        movie_title: 'Dunkirk',
        role: 'Producer' as const,
        image_path: null,
        rating: 7.8,
        release_date: '2017-07-21',
        genres: [1],
      },
    ]
    vi.mocked(personsApi.getPersonMovies).mockResolvedValue(moviesWithProducer)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/As Actor/)).toBeInTheDocument()
    })
    expect(screen.getByText(/As Director/)).toBeInTheDocument()
    expect(screen.getByText(/As Producer/)).toBeInTheDocument()
    expect(screen.getByText('Dunkirk')).toBeInTheDocument()
  })
})
