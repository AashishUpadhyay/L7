import { Link } from 'react-router-dom'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-14 flex-shrink-0 bg-header-blue flex items-center px-5 gap-3 text-white shadow-md border-b border-header-darker/30">
      <button
        type="button"
        onClick={onMenuClick}
        className="p-2 -ml-1 hover:bg-white/15 rounded-lg transition-colors"
        aria-label="Toggle menu"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
        </svg>
      </button>
      <h1 className="font-semibold text-xl tracking-tight text-white">Admin Console</h1>
      <div className="flex-1"></div>
      <Link
        to="/"
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Browse Movies
      </Link>
    </header>
  )
}
