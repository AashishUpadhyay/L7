import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'

function renderLayout() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div>Main content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('Layout', () => {
  it('renders header and sidebar', () => {
    renderLayout()
    expect(screen.getByRole('heading', { name: 'Admin Console' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Manage Movies/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Manage Professionals/i })).toBeInTheDocument()
  })

  it('renders outlet content', () => {
    renderLayout()
    expect(screen.getByText('Main content')).toBeInTheDocument()
  })

  it('toggles sidebar when menu button is clicked', () => {
    renderLayout()
    const menuButton = screen.getByRole('button', { name: 'Toggle menu' })
    fireEvent.click(menuButton)
    expect(screen.queryByRole('link', { name: /Manage Movies/i })).not.toBeInTheDocument()
    fireEvent.click(menuButton)
    expect(screen.getByRole('link', { name: /Manage Movies/i })).toBeInTheDocument()
  })
})
