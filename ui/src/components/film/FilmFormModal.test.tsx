import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { FilmFormModal } from './FilmFormModal'
import * as moviesApi from '@/api/movies'
import * as personsApi from '@/api/persons'

vi.mock('@/api/movies', () => ({
  createMovie: vi.fn(),
  updateMovie: vi.fn(),
  getMoviePersons: vi.fn(),
  addPersonsToMovie: vi.fn(),
  removePersonFromMovie: vi.fn(),
}))

vi.mock('@/api/persons', () => ({
  listPersons: vi.fn(),
  createPerson: vi.fn(),
}))

describe('FilmFormModal', () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock default API responses
    vi.mocked(personsApi.listPersons).mockResolvedValue({
      items: [
        { id: 1, name: 'John Doe', email: 'john@example.com', created_at: '', updated_at: '' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', created_at: '', updated_at: '' },
      ],
      total: 2,
      skip: 0,
      limit: 100,
    })
    vi.mocked(moviesApi.getMoviePersons).mockResolvedValue([])
  })

  it('renders "Add new film" for new movie', () => {
    render(
      <FilmFormModal
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null, image_path: null }}
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

  it('renders "Edit film" and pre-fills for existing movie', async () => {
    render(
      <FilmFormModal
        movie={{
          id: 1,
          title: 'Inception',
          description: 'A mind-bending film',
          release_date: '2010-07-16',
          genres: [3, 5],
          rating: 8.8,
          image_path: null,
          created_at: '',
          updated_at: '',
        }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { name: 'Edit film' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Inception')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A mind-bending film')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2010-07-16')).toBeInTheDocument()
    expect(screen.getByDisplayValue('8.8')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    render(
      <FilmFormModal
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null, image_path: null }}
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
        movie={{ id: 0, title: 'Test', description: '', release_date: null, genres: [], rating: null, image_path: null }}
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
      image_path: null,
      created_at: '',
      updated_at: '',
    })
    render(
      <FilmFormModal
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null, image_path: null }}
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
      image_path: null,
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
          image_path: null,
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
        movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null, image_path: null }}
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

  describe('Manage People (existing movie only)', () => {
    it('shows Manage People section for existing movie', async () => {
      render(
        <FilmFormModal
          movie={{
            id: 1,
            title: 'Inception',
            description: null,
            release_date: null,
            genres: [1],
            rating: null,
            image_path: null,
            created_at: '',
            updated_at: '',
          }}
          onClose={onClose}
          onSaved={onSaved}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('Manage People')).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
      expect(screen.getByText('+ Create New Person')).toBeInTheDocument()
      expect(screen.getByText('No people assigned yet.')).toBeInTheDocument()
    })

    it('does not show Manage People for new movie', () => {
      render(
        <FilmFormModal
          movie={{ id: 0, title: '', description: '', release_date: null, genres: [], rating: null }}
          onClose={onClose}
          onSaved={onSaved}
        />
      )
      expect(screen.queryByText('Manage People')).not.toBeInTheDocument()
      expect(screen.getByText(/Save the movie first to assign people to it/)).toBeInTheDocument()
    })

    it('calls addPersonsToMovie and onSaved when adding person to movie', async () => {
      vi.mocked(moviesApi.addPersonsToMovie).mockResolvedValue([
        { id: 1, movie_id: 1, person_id: 1, role: 'Actor' },
      ])
      vi.mocked(moviesApi.getMoviePersons).mockResolvedValue([
        { id: 1, person_id: 1, person_name: 'John Doe', person_email: 'john@example.com', role: 'Actor' },
      ])
      render(
        <FilmFormModal
          movie={{
            id: 1,
            title: 'Inception',
            description: null,
            release_date: null,
            genres: [1],
            rating: null,
            image_path: null,
            created_at: '',
            updated_at: '',
          }}
          onClose={onClose}
          onSaved={onSaved}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('Manage People')).toBeInTheDocument()
      })
      const comboboxes = screen.getAllByRole('combobox')
      fireEvent.change(comboboxes[0], { target: { value: '1' } })
      fireEvent.click(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => {
        expect(moviesApi.addPersonsToMovie).toHaveBeenCalledWith(1, [{ person_id: 1, role: 'Actor' }])
      })
      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledTimes(1)
      })
    })

    it('calls removePersonFromMovie and onSaved when removing person', async () => {
      vi.mocked(moviesApi.getMoviePersons)
        .mockResolvedValueOnce([
          { id: 1, person_id: 1, person_name: 'John Doe', person_email: 'john@example.com', role: 'Actor' },
        ])
        .mockResolvedValue([])
      vi.mocked(moviesApi.removePersonFromMovie).mockResolvedValue(undefined)
      render(
        <FilmFormModal
          movie={{
            id: 1,
            title: 'Inception',
            description: null,
            release_date: null,
            genres: [1],
            rating: null,
            image_path: null,
            created_at: '',
            updated_at: '',
          }}
          onClose={onClose}
          onSaved={onSaved}
        />
      )
      const removeButton = await screen.findByRole('button', { name: 'Remove' })
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(moviesApi.removePersonFromMovie).toHaveBeenCalledWith(1, 1, 'Actor')
      })
      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledTimes(1)
      })
    })

    it('shows Create New Person form when button clicked', async () => {
      render(
        <FilmFormModal
          movie={{
            id: 1,
            title: 'Inception',
            description: null,
            release_date: null,
            genres: [1],
            rating: null,
            image_path: null,
            created_at: '',
            updated_at: '',
          }}
          onClose={onClose}
          onSaved={onSaved}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('+ Create New Person')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('+ Create New Person'))
      expect(screen.getByRole('heading', { name: 'Create New Person' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
      const createSection = screen.getByRole('heading', { name: 'Create New Person' }).closest('div')
      expect(createSection).toBeInTheDocument()
      expect(within(createSection!).getByRole('button', { name: 'Create' })).toBeInTheDocument()
      expect(within(createSection!).getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('calls createPerson when creating new person', async () => {
      vi.mocked(personsApi.createPerson).mockResolvedValue({
        id: 3,
        name: 'New Actor',
        email: 'new@example.com',
        created_at: '',
        updated_at: '',
      })
      render(
        <FilmFormModal
          movie={{
            id: 1,
            title: 'Inception',
            description: null,
            release_date: null,
            genres: [1],
            rating: null,
            image_path: null,
            created_at: '',
            updated_at: '',
          }}
          onClose={onClose}
          onSaved={onSaved}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('+ Create New Person')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('+ Create New Person'))
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'New Actor' } })
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(personsApi.createPerson).toHaveBeenCalledWith({
          name: 'New Actor',
          email: 'new@example.com',
        })
      })
    })

    it('shows error when create person fails', async () => {
      vi.mocked(personsApi.createPerson).mockRejectedValue(new Error('Email already exists'))
      render(
        <FilmFormModal
          movie={{
            id: 1,
            title: 'Inception',
            description: null,
            release_date: null,
            genres: [1],
            rating: null,
            image_path: null,
            created_at: '',
            updated_at: '',
          }}
          onClose={onClose}
          onSaved={onSaved}
        />
      )
      await waitFor(() => {
        expect(screen.getByText('+ Create New Person')).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText('+ Create New Person'))
      fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'New' } })
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Create' }))

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument()
      })
    })
  })
})
