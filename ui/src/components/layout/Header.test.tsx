import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from './Header'

function renderHeader(props: { onMenuClick: () => void }) {
  return render(
    <MemoryRouter>
      <Header {...props} />
    </MemoryRouter>
  )
}

describe('Header', () => {
  it('renders title and menu button', () => {
    renderHeader({ onMenuClick: vi.fn() })
    expect(screen.getByRole('heading', { name: 'Admin Console' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle menu' })).toBeInTheDocument()
  })

  it('calls onMenuClick when menu button is clicked', () => {
    const onMenuClick = vi.fn()
    renderHeader({ onMenuClick })
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })

  it('renders Browse Movies link', () => {
    renderHeader({ onMenuClick: vi.fn() })
    const link = screen.getByText('Browse Movies')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/')
  })
})
