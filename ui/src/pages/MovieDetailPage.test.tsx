import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MovieDetailPage } from './MovieDetailPage'
import * as moviesApi from '@/api/movies'

vi.mock('@/api/movies', () => ({
  getMovie: vi.fn(),
  getMoviePersons: vi.fn(),
  getMovieReviews: vi.fn(),
  createMovieReview: vi.fn(),
}))

vi.mock('@/utils/favorites', () => ({
  addToWatchLater: vi.fn(),
  removeFromWatchLater: vi.fn(),
  isInWatchLater: vi.fn(() => false),
}))

function renderPage(movieId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/movie/${movieId}`]}>
      <Routes>
        <Route path="/movie/:id" element={<MovieDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MovieDetailPage', () => {
  const mockMovie = {
    id: 1,
    title: 'Inception',
    description: 'A thief who steals corporate secrets through dream-sharing technology.',
    rating: 8.8,
    release_date: '2010-07-16',
    genres: [1, 5], // Action, Sci-Fi
    image_path: '/images/inception.jpg',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  }

  const mockPersons = [
    {
      id: 1,
      person_id: 101,
      person_name: 'Christopher Nolan',
      person_email: 'nolan@example.com',
      role: 'Director' as const,
    },
    {
      id: 2,
      person_id: 102,
      person_name: 'Leonardo DiCaprio',
      person_email: 'leo@example.com',
      role: 'Actor' as const,
    },
    {
      id: 3,
      person_id: 103,
      person_name: 'Emma Thomas',
      person_email: 'emma@example.com',
      role: 'Producer' as const,
    },
  ]

  const mockReviews = {
    items: [
      {
        id: 1,
        movie_id: 1,
        author_name: 'John Doe',
        rating: 9.0,
        content: 'Amazing movie!',
        created_at: '2024-01-15T00:00:00Z',
      },
    ],
    total: 1,
    skip: 0,
    limit: 10,
    average_rating: 9.0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(moviesApi.getMovie).mockResolvedValue(mockMovie)
    vi.mocked(moviesApi.getMoviePersons).mockResolvedValue(mockPersons)
    vi.mocked(moviesApi.getMovieReviews).mockResolvedValue(mockReviews)
  })

  it('shows loading spinner initially', () => {
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('displays movie title and rating', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    expect(screen.getByText('8.8')).toBeInTheDocument()
  })

  it('displays movie description', async () => {
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText('A thief who steals corporate secrets through dream-sharing technology.')
      ).toBeInTheDocument()
    })
  })

  it('displays directors as clickable links', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Christopher Nolan')).toBeInTheDocument()
    })
    const directorLink = screen.getByText('Christopher Nolan').closest('a')
    expect(directorLink).toHaveAttribute('href', '/person/101')
  })

  it('displays actors as clickable links', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Leonardo DiCaprio')).toBeInTheDocument()
    })
    const actorLink = screen.getByText('Leonardo DiCaprio').closest('a')
    expect(actorLink).toHaveAttribute('href', '/person/102')
  })

  it('displays producers as clickable links', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Emma Thomas')).toBeInTheDocument()
    })
    const producerLink = screen.getByText('Emma Thomas').closest('a')
    expect(producerLink).toHaveAttribute('href', '/person/103')
  })

  it('shows error when movie not found', async () => {
    vi.mocked(moviesApi.getMovie).mockRejectedValue(new Error('Movie not found'))
    renderPage('999')
    await waitFor(() => {
      expect(screen.getByText('Movie not found')).toBeInTheDocument()
    })
  })

  it('renders Back to Browse link', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
    })
    const links = screen.getAllByText('Back to Browse')
    expect(links[0].closest('a')).toHaveAttribute('href', '/')
  })

  it('renders Watch Later link', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Watch Later')).toBeInTheDocument()
    })
    const link = screen.getByText('Watch Later').closest('a')
    expect(link).toHaveAttribute('href', '/watchlater')
  })

  it('displays reviews section', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Reviews')).toBeInTheDocument()
    })
    expect(screen.getByText('1 review')).toBeInTheDocument()
    expect(screen.getByText('9.0 average')).toBeInTheDocument()
  })

  it('displays review content', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    expect(screen.getByText('Amazing movie!')).toBeInTheDocument()
  })

  it('shows Write Review button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Write Review' })).toBeInTheDocument()
    })
  })

  it('opens review form when Write Review is clicked', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Write Review' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Write Review' }))
    await waitFor(() => {
      expect(screen.getByLabelText('Your Name')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Rating:/)).toBeInTheDocument()
    expect(screen.getByLabelText('Your Review')).toBeInTheDocument()
  })

  it('shows Watch Later button', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Add to Watch Later')).toBeInTheDocument()
    })
  })

  it('calls API endpoints on mount', async () => {
    renderPage('42')
    await waitFor(() => {
      expect(moviesApi.getMovie).toHaveBeenCalledWith(42)
    })
    expect(moviesApi.getMoviePersons).toHaveBeenCalledWith(42)
    expect(moviesApi.getMovieReviews).toHaveBeenCalledWith(42, 0, 10)
  })

  it('displays "Director" label when there is one director', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Director')).toBeInTheDocument()
    })
  })

  it('displays "Directors" label when there are multiple directors', async () => {
    const multipleDirectors = [
      ...mockPersons,
      {
        id: 4,
        person_id: 104,
        person_name: 'Another Director',
        person_email: 'director2@example.com',
        role: 'Director' as const,
      },
    ]
    vi.mocked(moviesApi.getMoviePersons).mockResolvedValue(multipleDirectors)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Directors')).toBeInTheDocument()
    })
  })

  it('displays "Producer" label when there is one producer', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Producer')).toBeInTheDocument()
    })
  })

  it('displays "Producers" label when there are multiple producers', async () => {
    const multipleProducers = [
      ...mockPersons,
      {
        id: 5,
        person_id: 105,
        person_name: 'Another Producer',
        person_email: 'producer2@example.com',
        role: 'Producer' as const,
      },
    ]
    vi.mocked(moviesApi.getMoviePersons).mockResolvedValue(multipleProducers)
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Producers')).toBeInTheDocument()
    })
  })

  it('shows message when there are no reviews', async () => {
    vi.mocked(moviesApi.getMovieReviews).mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 10,
      average_rating: null,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No reviews yet. Be the first to review this movie!')).toBeInTheDocument()
    })
  })
})
