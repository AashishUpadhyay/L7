import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('renders title and menu button', () => {
    render(<Header onMenuClick={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Admin Console' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Toggle menu' })).toBeInTheDocument()
  })

  it('calls onMenuClick when menu button is clicked', () => {
    const onMenuClick = vi.fn()
    render(<Header onMenuClick={onMenuClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle menu' }))
    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })
})
