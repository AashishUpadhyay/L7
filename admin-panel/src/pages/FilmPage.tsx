import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listMovies, searchMovies, deleteMovie, getMoviePersons } from '@/api/movies'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getImageUrl } from '@/utils/imageUrl'
import { GENRES } from '@/types/movie'
import type { Movie } from '@/types/movie'
import type { PersonInMovie } from '@/types/moviePerson'
import { FilmFormModal } from '@/components/film/FilmFormModal'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'

function formatDate(s: string | null) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString()
  } catch {
    return s
  }
}

function genreLabels(genres: number[]) {
  return genres
    .map((g) => GENRES.find((x) => x.value === g)?.label ?? g)
    .join(', ') || '—'
}

export function FilmPage() {
  const [items, setItems] = useState<Movie[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [searchTitle, setSearchTitle] = useState('')
  const debouncedSearchTitle = useDebouncedValue(searchTitle, 400, () => setSkip(0))
  const [formMovie, setFormMovie] = useState<Movie | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Movie | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Expandable rows state
  const [expandedMovies, setExpandedMovies] = useState<Set<number>>(new Set())
  const [moviePersons, setMoviePersons] = useState<Record<number, PersonInMovie[]>>({})
  const [loadingPersons, setLoadingPersons] = useState<Set<number>>(new Set())

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const trimmed = debouncedSearchTitle.trim()
      const res = trimmed
        ? await searchMovies({ title: trimmed, skip, limit })
        : await listMovies(skip, limit)
      setItems(res.items)
      setTotal(res.total)
      
      // Refresh person data for any currently expanded movies
      const expandedIds = Array.from(expandedMovies)
      if (expandedIds.length > 0) {
        const updatedPersons: Record<number, PersonInMovie[]> = {}
        for (const movieId of expandedIds) {
          try {
            const persons = await getMoviePersons(movieId)
            updatedPersons[movieId] = persons
          } catch (e) {
            console.error(`Failed to refresh persons for movie ${movieId}:`, e)
          }
        }
        setMoviePersons(updatedPersons)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [skip, limit, debouncedSearchTitle, expandedMovies])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleDelete = async (m: Movie) => {
    try {
      await deleteMovie(m.id)
      setDeleteTarget(null)
      fetchList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const toggleExpanded = async (movieId: number) => {
    const newExpanded = new Set(expandedMovies)
    if (newExpanded.has(movieId)) {
      newExpanded.delete(movieId)
      setExpandedMovies(newExpanded)
    } else {
      newExpanded.add(movieId)
      setExpandedMovies(newExpanded)
      
      // Always load persons (refresh on every expand)
      setLoadingPersons(new Set(loadingPersons).add(movieId))
      try {
        const persons = await getMoviePersons(movieId)
        setMoviePersons({ ...moviePersons, [movieId]: persons })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load persons')
      } finally {
        const newLoadingPersons = new Set(loadingPersons)
        newLoadingPersons.delete(movieId)
        setLoadingPersons(newLoadingPersons)
      }
    }
  }

  const currentPage = Math.floor(skip / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : skip + 1
  const to = Math.min(skip + limit, total)

  return (
    <div className="max-w-6xl">
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-5">
        <Link to="/film" className="hover:text-gray-700 transition-colors">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-gray-800 font-medium">Film</span>
      </nav>

      <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() =>
            setFormMovie({
              id: 0,
              title: '',
              description: null,
              release_date: null,
              genres: [],
              rating: null,
              image_path: null,
              created_at: '',
              updated_at: '',
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
        >
          <span>+</span> ADD NEW
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by title or description"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 max-w-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          />
          <button
            type="button"
            onClick={() => fetchList()}
            className="p-2.5 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            aria-label="Search"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Results</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setSkip(0) }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
          >
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-5 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-4 py-3 text-left font-medium w-12"></th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium w-20">Image</th>
              <th className="px-4 py-3 text-left font-medium">Title</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Release date</th>
              <th className="px-4 py-3 text-left font-medium">Genres</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No results</td></tr>
            ) : (
              items.map((movie, i) => {
                const isExpanded = expandedMovies.has(movie.id)
                const persons = moviePersons[movie.id] || []
                const isLoadingPersons = loadingPersons.has(movie.id)
                
                return (
                  <React.Fragment key={movie.id}>
                    <tr
                      key={movie.id}
                      className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(movie.id)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          <svg
                            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/film/${movie.id}`} className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center justify-center" title="View" aria-label="View">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </Link>
                          <button type="button" onClick={() => setFormMovie(movie)} className="p-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors inline-flex items-center justify-center" title="Edit" aria-label="Edit">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(movie)} className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex items-center justify-center" title="Delete" aria-label="Delete">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {movie.image_path ? (
                          <div className="relative group">
                            <img
                              src={getImageUrl(movie.image_path) || ''}
                              alt={movie.title}
                              className="w-12 h-16 object-cover rounded border border-gray-200 shadow-sm cursor-pointer transition-transform hover:scale-110"
                            />
                            <div className="absolute left-0 top-0 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50 pointer-events-none">
                              <img
                                src={getImageUrl(movie.image_path) || ''}
                                alt={movie.title}
                                className="max-w-md max-h-96 rounded-lg border-4 border-white shadow-2xl ml-16 ring-2 ring-gray-300"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="w-12 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200 text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{movie.title}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-gray-600" title={movie.description ?? ''}>{movie.description ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(movie.release_date)}</td>
                      <td className="px-4 py-3 text-gray-600">{genreLabels(movie.genres)}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${movie.id}-expanded`} className="bg-blue-50/30">
                        <td colSpan={7} className="px-4 py-3">
                          {isLoadingPersons ? (
                            <p className="text-sm text-gray-500 italic">Loading people...</p>
                          ) : persons.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No people assigned to this movie.</p>
                          ) : (
                            <div className="pl-8">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">People in this movie:</h4>
                              <div className="space-y-1">
                                {persons.map((person) => (
                                  <div
                                    key={`${person.person_id}-${person.role}`}
                                    className="flex items-center gap-3 text-sm bg-white px-3 py-2 rounded border border-gray-200"
                                  >
                                    <span className="font-medium text-gray-800">{person.person_name}</span>
                                    <span className="text-gray-500">•</span>
                                    <span className="text-gray-600">{person.role}</span>
                                    <Link
                                      to={`/professionals/${person.person_id}`}
                                      className="ml-auto text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      View Profile →
                                    </Link>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-5 text-sm">
        <span className="text-gray-500">Page</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(6, totalPages) }, (_, i) => {
            const p = i + 1
            const isCurrent = p === currentPage
            return (
              <button key={p} type="button" onClick={() => setSkip((p - 1) * limit)} className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
            )
          })}
        </div>
        <button type="button" onClick={() => setSkip(Math.min(skip + limit, (totalPages - 1) * limit))} disabled={currentPage >= totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none">&gt;</button>
        <button type="button" onClick={() => setSkip((totalPages - 1) * limit)} disabled={currentPage >= totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none">&gt;&gt;</button>
        <span className="text-gray-500">Results {from} to {to} of {total}</span>
      </div>

      {formMovie && (
        <FilmFormModal
          movie={formMovie}
          onClose={() => setFormMovie(null)}
          onSaved={() => {
            setFormMovie(null)
            fetchList()
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete film?"
          message={`Delete "${deleteTarget.title}"?`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
