import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ActorPage } from './ActorPage'
import * as personsApi from '@/api/persons'

vi.mock('@/api/persons', () => ({
  listPersons: vi.fn(),
  searchPersons: vi.fn(),
  deletePerson: vi.fn(),
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
      },
    ],
    total: 1,
    skip: 0,
    limit: 10,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(personsApi.listPersons).mockResolvedValue(mockPersons)
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
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/actor')
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
      expect(screen.getByRole('heading', { name: 'Delete actor?' })).toBeInTheDocument()
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
})
