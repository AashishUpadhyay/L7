import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ActorDetailPage } from './ActorDetailPage'
import * as personsApi from '@/api/persons'

vi.mock('@/api/persons', () => ({
  getPerson: vi.fn(),
  deletePerson: vi.fn(),
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
    <MemoryRouter initialEntries={[`/admin/professionals/${id}`]}>
      <Routes>
        <Route path="/admin/professionals/:id" element={<ActorDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ActorDetailPage', () => {
  const person = {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(personsApi.getPerson).mockResolvedValue(person)
  })

  it('shows loading then person details', async () => {
    renderWithRouter('1')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Professional #1/ })).toBeInTheDocument()
    })
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1)
  })

  it('renders breadcrumbs with Home, Actor, and name', async () => {
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Professional #1/ })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /Home/i })).toHaveAttribute('href', '/admin')
    expect(screen.getByRole('link', { name: 'Manage Professionals' })).toHaveAttribute('href', '/admin/professionals')
    expect(screen.getByRole('navigation')).toHaveTextContent('Jane Doe')
  })

  it('shows error when getPerson fails', async () => {
    vi.mocked(personsApi.getPerson).mockRejectedValue(new Error('Network error'))
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('opens edit modal when Edit is clicked', async () => {
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Professional #1/ })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit actor' })).toBeInTheDocument()
    })
  })

  it('opens delete confirm modal when Delete is clicked', async () => {
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Professional #1/ })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete professional?' })).toBeInTheDocument()
      expect(screen.getByText(/Delete Jane Doe\?/)).toBeInTheDocument()
    })
  })

  it('calls deletePerson and navigates on confirm delete', async () => {
    vi.mocked(personsApi.deletePerson).mockResolvedValue(undefined)
    renderWithRouter('1')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Delete professional?' })).toBeInTheDocument()
    })
    const buttons = screen.getAllByRole('button', { name: 'Delete' })
    fireEvent.click(buttons[buttons.length - 1])
    await waitFor(() => {
      expect(personsApi.deletePerson).toHaveBeenCalledWith(1)
      expect(mockNavigate).toHaveBeenCalledWith('/admin/professionals')
    })
  })
})
