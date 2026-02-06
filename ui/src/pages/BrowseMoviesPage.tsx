import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listMovies, searchMovies, getMoviePersons } from '@/api/movies'
import { listPersons } from '@/api/persons'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getImageUrl } from '@/utils/imageUrl'
import { GENRES } from '@/types/movie'
import type { Movie } from '@/types/movie'
import type { Person } from '@/types/person'
import type { PersonInMovie } from '@/types/moviePerson'
import { addToWatchLater, removeFromWatchLater, isInWatchLater, getWatchLaterCount } from '@/utils/favorites'

function formatYear(dateString: string | null): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).getFullYear().toString()
  } catch {
    return '—'
  }
}

function getGenreLabel(genreValue: number): string {
  return GENRES.find(g => g.value === genreValue)?.label ?? 'Unknown'
}

interface MovieCardProps {
  movie: Movie
  onWatchLaterChange: () => void
}

function MovieCard({ movie, onWatchLaterChange }: MovieCardProps) {
  const [persons, setPersons] = useState<PersonInMovie[]>([])
  const [isHovered, setIsHovered] = useState(false)
  const [personsLoaded, setPersonsLoaded] = useState(false)
  const [inWatchLater, setInWatchLater] = useState(false)

  useEffect(() => {
    if (isHovered && !personsLoaded) {
      getMoviePersons(movie.id)
        .then(setPersons)
        .catch(console.error)
        .finally(() => setPersonsLoaded(true))
    }
  }, [isHovered, movie.id, personsLoaded])

  useEffect(() => {
    setInWatchLater(isInWatchLater(movie.id))
  }, [movie.id])

  const handleWatchLaterToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    if (inWatchLater) {
      removeFromWatchLater(movie.id)
    } else {
      addToWatchLater({
        id: movie.id,
        title: movie.title,
        image_path: movie.image_path,
        rating: movie.rating,
        release_date: movie.release_date,
        genres: movie.genres,
      })
    }
    setInWatchLater(!inWatchLater)
    onWatchLaterChange()
  }

  const actors = persons.filter(p => p.role === 'Actor')
  const directors = persons.filter(p => p.role === 'Director')
  const year = formatYear(movie.release_date)
  const imageUrl = movie.image_path ? getImageUrl(movie.image_path) : null

  return (
    <Link
      to={`/movie/${movie.id}`}
      className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Movie Poster */}
      <div className="relative aspect-[2/3] overflow-hidden bg-gray-200">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
        
        {/* Watch Later Button - Always on top */}
        <button
          onClick={handleWatchLaterToggle}
          className={`absolute top-2 right-2 p-2 rounded-full transition-all duration-200 z-20 ${
            inWatchLater
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
          title={inWatchLater ? 'Remove from Watch Later' : 'Add to Watch Later'}
        >
          <svg className="w-5 h-5" fill={inWatchLater ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
        
        {/* Hover Overlay */}
        {isHovered && personsLoaded && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 animate-fade-in z-10">
            <div className="text-white text-sm space-y-3">
              {directors.length > 0 && (
                <div>
                  <p className="font-semibold text-yellow-400 mb-1">Director{directors.length > 1 ? 's' : ''}:</p>
                  {directors.map(d => (
                    <p key={`${d.person_id}-${d.role}`} className="text-gray-200">{d.person_name}</p>
                  ))}
                </div>
              )}
              {actors.length > 0 && (
                <div>
                  <p className="font-semibold text-yellow-400 mb-1">Actor{actors.length > 1 ? 's' : ''}:</p>
                  {actors.slice(0, 3).map(a => (
                    <p key={`${a.person_id}-${a.role}`} className="text-gray-200">{a.person_name}</p>
                  ))}
                  {actors.length > 3 && (
                    <p className="text-gray-400 text-xs mt-1">+{actors.length - 3} more</p>
                  )}
                </div>
              )}
              {persons.length === 0 && (
                <p className="text-gray-400 italic">No cast information available</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2 min-h-[3rem]">
          {movie.title}
        </h3>
        
        <div className="flex items-center gap-2 mb-2">
          {movie.rating !== null && (
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
              <span className="text-sm font-medium text-gray-900">{movie.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{year}</span>
          {movie.genres.length > 0 && (
            <span className="truncate ml-2">{getGenreLabel(movie.genres[0])}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export function BrowseMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [watchLaterCount, setWatchLaterCount] = useState(0)
  const limit = 20
  
  // Sorting and Filtering
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400, () => setPage(1))
  const [sortBy, setSortBy] = useState<'default' | 'rating'>('default')
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [selectedActorIds, setSelectedActorIds] = useState<number[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [minRating, setMinRating] = useState<number | null>(null)
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false)
  const [actorDropdownOpen, setActorDropdownOpen] = useState(false)
  const [actors, setActors] = useState<Person[]>([])
  const [actorsLoading, setActorsLoading] = useState(false)

  const updateWatchLaterCount = () => {
    setWatchLaterCount(getWatchLaterCount())
  }

  // Load actors for filter
  useEffect(() => {
    const fetchActors = async () => {
      setActorsLoading(true)
      try {
        const response = await listPersons(0, 100)
        setActors(response.items)
      } catch (e) {
        console.error('Failed to load actors:', e)
      } finally {
        setActorsLoading(false)
      }
    }
    fetchActors()
  }, [])

  useEffect(() => {
    const fetchMovies = async () => {
      setLoading(true)
      setError(null)
      try {
        const skip = (page - 1) * limit
        const trimmedSearch = debouncedSearchQuery.trim()
        const hasFilters = trimmedSearch || selectedGenres.length > 0 || selectedActorIds.length > 0 || selectedYear !== null
        
        let response
        if (hasFilters) {
          response = await searchMovies({
            title: trimmedSearch || undefined,
            genres: selectedGenres.length > 0 ? selectedGenres : undefined,
            actor_ids: selectedActorIds.length > 0 ? selectedActorIds : undefined,
            release_year: selectedYear || undefined,
            skip,
            limit,
          })
        } else {
          response = await listMovies(skip, limit)
        }
        
        let moviesList = response.items
        
        // Apply rating filter (client-side)
        if (minRating !== null) {
          moviesList = moviesList.filter(m => m.rating !== null && m.rating >= minRating)
        }
        
        // Apply sorting
        if (sortBy === 'rating') {
          moviesList = [...moviesList].sort((a, b) => {
            const ratingA = a.rating ?? 0
            const ratingB = b.rating ?? 0
            return ratingB - ratingA // Descending order
          })
        }
        
        setMovies(moviesList)
        setTotal(response.total)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load movies')
        setMovies([])
      } finally {
        setLoading(false)
      }
    }

    fetchMovies()
    updateWatchLaterCount()
  }, [page, debouncedSearchQuery, selectedGenres, selectedActorIds, selectedYear, minRating, sortBy])

  const toggleGenre = (genreValue: number) => {
    setSelectedGenres(prev => 
      prev.includes(genreValue) ? prev.filter(g => g !== genreValue) : [...prev, genreValue]
    )
    setPage(1)
  }

  const toggleActor = (actorId: number) => {
    setSelectedActorIds(prev => 
      prev.includes(actorId) ? prev.filter(id => id !== actorId) : [...prev, actorId]
    )
    setPage(1)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedGenres([])
    setSelectedActorIds([])
    setSelectedYear(null)
    setMinRating(null)
    setSortBy('default')
    setPage(1)
  }

  const hasActiveFilters = searchQuery.trim() || selectedGenres.length > 0 || selectedActorIds.length > 0 || selectedYear !== null || minRating !== null || sortBy !== 'default'

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      {/* Public Header */}
      <header className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              MovieDB
            </h1>
            <nav className="flex items-center gap-4 text-gray-300 text-sm">
              <Link to="/watchlater" className="hover:text-white transition-colors px-3 py-2 flex items-center gap-2 relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Watch Later
                {watchLaterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {watchLaterCount}
                  </span>
                )}
              </Link>
              <Link to="/admin" className="hover:text-white transition-colors px-3 py-2">Admin Panel</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Browse Movies</h2>
          <p className="text-gray-300">Discover our collection of {total} movies</p>
        </div>

        {/* Filters and Sort */}
        <div className="mb-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 flex items-center gap-2 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search movies by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-gray-200 placeholder-gray-400 outline-none text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-300 font-medium">Sort:</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'default' | 'rating')
                  setPage(1)
                }}
                className="bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none"
              >
                <option value="default">Default</option>
                <option value="rating">Rating (High to Low)</option>
              </select>
            </div>

            <div className="h-6 w-px bg-gray-600"></div>

          {/* Genre Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 hover:bg-gray-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Genre {selectedGenres.length > 0 && `(${selectedGenres.length})`}
              <svg className={`w-4 h-4 transition-transform ${genreDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {genreDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setGenreDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    {GENRES.map((genre) => (
                      <label
                        key={genre.value}
                        className="flex items-center gap-2 px-2 py-2 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGenres.includes(genre.value)}
                          onChange={() => toggleGenre(genre.value)}
                          className="rounded border-gray-500 bg-gray-700 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-200">{genre.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Actor Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActorDropdownOpen(!actorDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 hover:bg-gray-600 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Actor {selectedActorIds.length > 0 && `(${selectedActorIds.length})`}
              <svg className={`w-4 h-4 transition-transform ${actorDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {actorDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActorDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    {actorsLoading ? (
                      <p className="text-sm text-gray-400 text-center py-2">Loading...</p>
                    ) : actors.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-2">No actors found</p>
                    ) : (
                      actors.map((actor) => (
                        <label
                          key={actor.id}
                          className="flex items-center gap-2 px-2 py-2 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedActorIds.includes(actor.id)}
                            onChange={() => toggleActor(actor.id)}
                            className="rounded border-gray-500 bg-gray-700 text-red-600 focus:ring-red-500"
                          />
                          <span className="text-sm text-gray-200">{actor.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300 font-medium">Year:</label>
            <select
              value={selectedYear || ''}
              onChange={(e) => {
                setSelectedYear(e.target.value ? Number(e.target.value) : null)
                setPage(1)
              }}
              className="bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none"
            >
              <option value="">All Years</option>
              {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300 font-medium">Min Rating:</label>
            <select
              value={minRating || ''}
              onChange={(e) => {
                setMinRating(e.target.value ? Number(e.target.value) : null)
                setPage(1)
              }}
              className="bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none"
            >
              <option value="">Any Rating</option>
              {[9, 8, 7, 6, 5].map(rating => (
                <option key={rating} value={rating}>{rating}+ ⭐</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear All
            </button>
          )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedGenres.length > 0 || selectedActorIds.length > 0) && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-400 font-medium">Active:</span>
            {selectedGenres.map(genreValue => {
              const genre = GENRES.find(g => g.value === genreValue)
              return genre ? (
                <span
                  key={genreValue}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/50 text-red-200 border border-red-700 rounded-full text-sm"
                >
                  {genre.label}
                  <button
                    type="button"
                    onClick={() => toggleGenre(genreValue)}
                    className="hover:bg-red-800 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${genre.label}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ) : null
            })}
            {selectedActorIds.map(actorId => {
              const actor = actors.find(a => a.id === actorId)
              return actor ? (
                <span
                  key={actorId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-900/50 text-red-200 border border-red-700 rounded-full text-sm"
                >
                  {actor.name}
                  <button
                    type="button"
                    onClick={() => toggleActor(actorId)}
                    className="hover:bg-red-800 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${actor.name}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ) : null
            })}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 text-red-200 rounded-lg border border-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
          </div>
        ) : movies.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="text-lg">No movies found</p>
          </div>
        ) : (
          <>
            {/* Movie Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-8">
              {movies.map(movie => (
                <MovieCard key={movie.id} movie={movie} onWatchLaterChange={updateWatchLaterCount} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pb-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-medium transition-colors ${
                          pageNum === page
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className={`min-w-[2.5rem] h-10 px-3 rounded-lg font-medium transition-colors ${
                          totalPages === page
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-800 border border-gray-600 text-gray-200 hover:bg-gray-700'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-800 border border-gray-600 text-gray-200 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
