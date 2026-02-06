import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPerson, getPersonMovies } from '@/api/persons'
import { getImageUrl } from '@/utils/imageUrl'
import { GENRES } from '@/types/movie'
import type { Person } from '@/types/person'
import type { MovieInPerson } from '@/types/moviePerson'

function getGenreLabel(genreValue: number): string {
  return GENRES.find(g => g.value === genreValue)?.label ?? 'Unknown'
}

function formatYear(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  try {
    return new Date(dateString).getFullYear().toString()
  } catch {
    return 'Unknown'
  }
}

export function PersonProfilePage() {
  const { id } = useParams<{ id: string }>()
  const [person, setPerson] = useState<Person | null>(null)
  const [movies, setMovies] = useState<MovieInPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [personData, moviesData] = await Promise.all([
          getPerson(Number(id)),
          getPersonMovies(Number(id))
        ])
        setPerson(personData)
        setMovies(moviesData)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load person profile')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        <header className="bg-gray-900 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <Link to="/" className="text-white hover:text-gray-300 transition-colors flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Browse
            </Link>
          </div>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-400 text-lg">{error || 'Person not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  // Group movies by role
  const moviesByRole = movies.reduce((acc, movie) => {
    if (!acc[movie.role]) {
      acc[movie.role] = []
    }
    acc[movie.role].push(movie)
    return acc
  }, {} as Record<string, MovieInPerson[]>)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-white hover:text-gray-300 transition-colors flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Browse
            </Link>
            <Link to="/watchlater" className="text-gray-300 hover:text-white transition-colors text-sm">
              Watch Later
            </Link>
          </div>
        </div>
      </header>

      {/* Person Profile */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Person Info */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
              <span className="text-white text-3xl font-bold">
                {person.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold text-white">{person.name}</h1>
              <p className="text-gray-400 mt-2">{movies.length} {movies.length === 1 ? 'credit' : 'credits'}</p>
            </div>
          </div>
        </div>

        {/* Movies by Role */}
        {Object.entries(moviesByRole).map(([role, roleMovies]) => (
          <div key={role} className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-6">
              As {role} <span className="text-gray-500 text-xl">({roleMovies.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {roleMovies.map(movie => {
                const imageUrl = movie.image_path ? getImageUrl(movie.image_path) : null
                const year = formatYear(movie.release_date)
                return (
                  <Link
                    key={movie.id}
                    to={`/movie/${movie.movie_id}`}
                    className="group"
                  >
                    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-red-500 transition-all duration-200 hover:scale-105">
                      <div className="aspect-[2/3] bg-gray-700 flex items-center justify-center relative overflow-hidden">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={movie.movie_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        )}
                        {movie.rating !== null && (
                          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded-md flex items-center gap-1">
                            <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                            <span className="text-yellow-500 text-xs font-bold">{movie.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="text-white font-medium text-sm line-clamp-2 group-hover:text-red-400 transition-colors mb-1">
                          {movie.movie_title}
                        </h3>
                        <p className="text-gray-500 text-xs">{year}</p>
                        {movie.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {movie.genres.slice(0, 2).map(genre => (
                              <span key={genre} className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                                {getGenreLabel(genre)}
                              </span>
                            ))}
                            {movie.genres.length > 2 && (
                              <span className="text-gray-500 text-xs">+{movie.genres.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        {movies.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No movies found for this person.</p>
          </div>
        )}
      </div>
    </div>
  )
}
