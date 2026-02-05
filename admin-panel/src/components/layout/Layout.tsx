import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header onMenuClick={() => setSidebarOpen((o) => !o)} />
      <div className="flex flex-1 min-h-0 h-[calc(100vh-3.5rem)] overflow-hidden">
        {sidebarOpen && <Sidebar />}
        <main className="flex-1 min-w-0 p-6 bg-gray-100/80 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
