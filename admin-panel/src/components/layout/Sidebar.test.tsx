import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

function renderWithRouter(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders Film and Actor nav links', () => {
    renderWithRouter()
    expect(screen.getByRole('link', { name: /Film/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Actor/i })).toBeInTheDocument()
  })

  it('links to /film and /actor', () => {
    renderWithRouter()
    const filmLink = screen.getByRole('link', { name: /Film/i })
    const actorLink = screen.getByRole('link', { name: /Actor/i })
    expect(filmLink).toHaveAttribute('href', '/film')
    expect(actorLink).toHaveAttribute('href', '/actor')
  })

  it('shows active styling for current route', () => {
    renderWithRouter(['/film'])
    const filmLink = screen.getByRole('link', { name: /Film/i })
    expect(filmLink.className).toMatch(/bg-sidebar-active/)
  })
})
