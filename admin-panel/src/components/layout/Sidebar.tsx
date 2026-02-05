import { Link, useLocation } from 'react-router-dom'

const nav = [
  { label: 'Film', to: '/film', icon: '🎬' },
  { label: 'Actor', to: '/actor', icon: '🎥' },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside
        className="w-56 flex-shrink-0 bg-sidebar-bg text-sidebar-text flex flex-col overflow-auto border-r border-sidebar-hover/80"
        style={{ height: 'calc(100vh - 3.5rem)' }}
      >
      <nav className="flex-1 py-5 px-3">
        {nav.map(({ to, label, icon }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/')
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-active text-white shadow-sm'
                  : 'text-sidebar-text/90 hover:bg-sidebar-hover hover:text-white'
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
