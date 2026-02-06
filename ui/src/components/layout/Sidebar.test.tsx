import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

function renderWithRouter(initialEntries: string[] = ['/admin']) {
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
    expect(screen.getByRole('link', { name: /Manage Movies/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Manage Professionals/i })).toBeInTheDocument()
  })

  it('links to correct routes', () => {
    renderWithRouter()
    const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
    const filmLink = screen.getByRole('link', { name: /Manage Movies/i })
    const professionalsLink = screen.getByRole('link', { name: /Manage Professionals/i })
    expect(dashboardLink).toHaveAttribute('href', '/admin')
    expect(filmLink).toHaveAttribute('href', '/admin/movies')
    expect(professionalsLink).toHaveAttribute('href', '/admin/professionals')
  })

  it('shows active styling for current route', () => {
    renderWithRouter(['/admin/movies'])
    const filmLink = screen.getByRole('link', { name: /Manage Movies/i })
    expect(filmLink.className).toMatch(/bg-sidebar-active/)
  })
})
