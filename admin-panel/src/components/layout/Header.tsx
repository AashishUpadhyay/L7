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
    </header>
  )
}
