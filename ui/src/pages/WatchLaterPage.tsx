import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getImageUrl } from '@/utils/imageUrl'
import { GENRES } from '@/types/movie'
import { getWatchLater, removeFromWatchLater, clearWatchLater, type WatchLaterMovie } from '@/utils/favorites'

function getGenreLabel(genreValue: number): string {
  return GENRES.find(g => g.value === genreValue)?.label ?? 'Unknown'
}

function formatYear(dateString: string | null): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).getFullYear().toString()
  } catch {
    return '—'
  }
}

function formatAddedDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  } catch {
    return ''
  }
}

export function WatchLaterPage() {
  const [movies, setMovies] = useState<WatchLaterMovie[]>([])
  const [loading, setLoading] = useState(true)

  const loadMovies = () => {
    setLoading(true)
    const saved = getWatchLater()
    // Sort by most recently added
    saved.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    setMovies(saved)
    setLoading(false)
  }

  useEffect(() => {
    loadMovies()
  }, [])

  const handleRemove = (movieId: number) => {
    removeFromWatchLater(movieId)
    loadMovies()
  }

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to remove all movies from your Watch Later list?')) {
      clearWatchLater()
      loadMovies()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-white flex items-center gap-2 hover:text-gray-300 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Browse
            </Link>
            <nav className="text-gray-300 text-sm">
              <Link to="/admin" className="hover:text-white transition-colors px-3 py-2">Admin Panel</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Watch Later
            </h1>
            <p className="text-gray-300">
              {movies.length === 0 ? 'No movies saved yet' : `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'} saved`}
            </p>
          </div>
          {movies.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-24 h-24 mx-auto mb-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <h2 className="text-2xl font-semibold text-gray-400 mb-4">Your Watch Later list is empty</h2>
            <p className="text-gray-500 mb-8">Start adding movies you want to watch later!</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
            >
              Browse Movies
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {movies.map(movie => {
              const imageUrl = movie.image_path ? getImageUrl(movie.image_path) : null
              return (
                <div
                  key={movie.id}
                  className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 flex"
                >
                  {/* Movie Poster */}
                  <Link to={`/movie/${movie.id}`} className="flex-shrink-0">
                    <div className="w-32 h-48 bg-gray-700">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Movie Info */}
                  <div className="flex-1 p-4 flex flex-col">
                    <Link to={`/movie/${movie.id}`}>
                      <h3 className="font-semibold text-white text-lg mb-2 hover:text-gray-300 transition-colors line-clamp-2">
                        {movie.title}
                      </h3>
                    </Link>
                    
                    <div className="flex items-center gap-3 mb-3 text-sm">
                      {movie.rating !== null && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                            <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                          </svg>
                          <span className="text-gray-300 font-medium">{movie.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <span className="text-gray-400">{formatYear(movie.release_date)}</span>
                      {movie.genres.length > 0 && (
                        <span className="text-gray-400">{getGenreLabel(movie.genres[0])}</span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Added {formatAddedDate(movie.addedAt)}
                      </span>
                      <button
                        onClick={() => handleRemove(movie.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
