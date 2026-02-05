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
  it('renders navigation links', () => {
    renderWithRouter()
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Film/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Professional/i })).toBeInTheDocument()
  })

  it('links to correct routes', () => {
    renderWithRouter()
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
    const filmLink = screen.getByRole('link', { name: /Film/i })
    const professionalsLink = screen.getByRole('link', { name: /Professional/i })
    expect(dashboardLink).toHaveAttribute('href', '/')
    expect(filmLink).toHaveAttribute('href', '/film')
    expect(professionalsLink).toHaveAttribute('href', '/professionals')
  })

  it('shows active styling for current route', () => {
    renderWithRouter(['/film'])
    const filmLink = screen.getByRole('link', { name: /Film/i })
    expect(filmLink.className).toMatch(/bg-sidebar-active/)
  })
})
