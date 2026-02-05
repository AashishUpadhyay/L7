import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ActorFormModal } from './ActorFormModal'
import * as personsApi from '@/api/persons'

vi.mock('@/api/persons', () => ({
  createPerson: vi.fn(),
  updatePerson: vi.fn(),
}))

describe('ActorFormModal', () => {
  const onClose = vi.fn()
  const onSaved = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Add new actor" for new person', () => {
    render(
      <ActorFormModal
        person={{ id: 0, name: '', email: '' }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByRole('heading', { name: 'Add new actor' })).toBeInTheDocument()
    expect(screen.getByLabelText(/First name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
  })

  it('renders "Edit actor" and pre-fills for existing person', () => {
    render(
      <ActorFormModal
        person={{
          id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          created_at: '',
          updated_at: '',
        }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    expect(screen.getByRole('heading', { name: 'Edit actor' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument()
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument()
  })

  it('calls onClose when Cancel is clicked', () => {
    render(
      <ActorFormModal
        person={{ id: 0, name: '', email: '' }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls createPerson and onSaved on submit for new actor', async () => {
    vi.mocked(personsApi.createPerson).mockResolvedValue({
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      created_at: '',
      updated_at: '',
    })
    render(
      <ActorFormModal
        person={{ id: 0, name: '', email: '' }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: 'Doe' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(personsApi.createPerson).toHaveBeenCalledWith({ name: 'John Doe', email: 'john@example.com' })
    })
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
  })

  it('calls updatePerson and onSaved on submit for existing actor', async () => {
    vi.mocked(personsApi.updatePerson).mockResolvedValue({
      id: 1,
      name: 'Jane Smith',
      email: 'jane@example.com',
      created_at: '',
      updated_at: '',
    })
    render(
      <ActorFormModal
        person={{
          id: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          created_at: '',
          updated_at: '',
        }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText(/Last name/i), { target: { value: 'Smith' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(personsApi.updatePerson).toHaveBeenCalledWith(1, {
        name: 'Jane Smith',
        email: 'jane@example.com',
      })
    })
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
  })

  it('shows error message when save fails', async () => {
    vi.mocked(personsApi.createPerson).mockRejectedValue(new Error('Network error'))
    render(
      <ActorFormModal
        person={{ id: 0, name: '', email: '' }}
        onClose={onClose}
        onSaved={onSaved}
      />
    )
    fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
    expect(onSaved).not.toHaveBeenCalled()
  })
})
