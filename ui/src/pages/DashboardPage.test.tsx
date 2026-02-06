import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DashboardPage } from './DashboardPage'
import * as statsApi from '@/api/stats'

vi.mock('@/api/stats')

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    vi.spyOn(statsApi, 'getStats').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )
    render(<DashboardPage />)
    expect(screen.getByText(/loading statistics/i)).toBeInTheDocument()
  })

  it('renders dashboard with stats', async () => {
    vi.spyOn(statsApi, 'getStats').mockResolvedValue({
      total_movies: 150,
      total_professionals: 75,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    expect(screen.getByText('150')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('Total Movies')).toBeInTheDocument()
    expect(screen.getByText('Total Professionals')).toBeInTheDocument()
  })

  it('renders error state when API fails', async () => {
    vi.spyOn(statsApi, 'getStats').mockRejectedValue(new Error('Network error'))

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText(/error.*network error/i)).toBeInTheDocument()
    })
  })

  it('renders links to film and actor pages', async () => {
    vi.spyOn(statsApi, 'getStats').mockResolvedValue({
      total_movies: 10,
      total_professionals: 5,
    })

    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    const filmLink = screen.getByRole('link', { name: /view all movies/i })
    const actorLink = screen.getByRole('link', { name: /view all professionals/i })

    expect(filmLink).toHaveAttribute('href', '/admin/movies')
    expect(actorLink).toHaveAttribute('href', '/admin/professionals')
  })
})
