import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FilmFormModal } from './FilmFormModal'
import * as moviesApi from '@/api/movies'

vi.mock('@/api/movies', () => ({
  createMovie: vi.fn(),
  updateMovie: vi.fn(),
}))

describe('FilmFormModal', () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Add new film" for new movie', () => {
    render(
      <FilmFormModal
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByRole('heading', { name: 'Add new film' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Release date/i)).toBeInTheDocument()
    expect(screen.getByText(/Genres \(at least one\)/)).toBeInTheDocument()
  })

  it('renders "Edit film" and pre-fills for existing movie', () => {
    render(
      <FilmFormModal
        movie={{
          id: 1,
          title: 'Inception',
          description: 'A mind-bending film',
          release_date: '2010-07-16',
          genres: [3, 5],
          rating: 8.8,
          created_at: '',
          updated_at: '',
        }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByRole('heading', { name: 'Edit film' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Inception')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A mind-bending film')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2010-07-16')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8.8')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    render(
      <FilmFormModal
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows error when submitting without genres', async () => {
    render(
      <FilmFormModal
        movie={{ id: 0, title: 'Test', description: '', release_date: null, genres: [], rating: null }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test Film' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Select at least one genre')).toBeInTheDocument()
    })
    expect(moviesApi.createMovie).not.toHaveBeenCalled()
  })

  it('calls createMovie and onSaved on submit for new film', async () => {
    vi.mocked(moviesApi.createMovie).mockResolvedValue({
      id: 1,
      title: 'New Film',
      description: null,
      release_date: '2024-01-01',
      genres: [1],
      rating: null,
      created_at: '',
      updated_at: '',
    })
    render(
      <FilmFormModal
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'New Film' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Action' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(moviesApi.createMovie).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Film',
          genres: [1],
        })
      )
    })
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
  })

  it('calls updateMovie and onSaved on submit for existing film', async () => {
    vi.mocked(moviesApi.updateMovie).mockResolvedValue({
      id: 1,
      title: 'Updated Title',
      description: null,
      release_date: null,
      genres: [2],
      rating: 7.5,
      created_at: '',
      updated_at: '',
    })
    render(
      <FilmFormModal
        movie={{
          id: 1,
          title: 'Original',
          description: null,
          release_date: null,
          genres: [1],
          rating: null,
          created_at: '',
          updated_at: '',
        }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Updated Title' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Action' })) // deselect
    fireEvent.click(screen.getByRole('checkbox', { name: 'Comedy' })) // select
    fireEvent.change(screen.getByLabelText(/Rating/i), { target: { value: '7.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(moviesApi.updateMovie).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          title: 'Updated Title',
          genres: [2],
          rating: 7.5,
        })
      )
    })
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error message when save fails', async () => {
    vi.mocked(moviesApi.createMovie).mockRejectedValue(new Error('Server error'))
    render(
      <FilmFormModal
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Test' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Action' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
    expect(onSaved).not.toHaveBeenCalled()
  })
})
