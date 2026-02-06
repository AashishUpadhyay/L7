import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listPersons, searchPersons, deletePerson, getPersonMovies } from '@/api/persons'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Person } from '@/types/person'
import type { MovieInPerson, MovieRole } from '@/types/moviePerson'
import { MOVIE_ROLES } from '@/types/moviePerson'
import { ActorFormModal } from '@/components/actor/ActorFormModal'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'

export function ActorPage() {
  const [items, setItems] = useState<Person[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<MovieRole[]>([])
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400, () => setSkip(0))
  const [formPerson, setFormPerson] = useState<Person | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [movieModalPerson, setMovieModalPerson] = useState<Person | null>(null)
  const [personMovies, setPersonMovies] = useState<MovieInPerson[]>([])
  const [loadingMovies, setLoadingMovies] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const trimmed = debouncedSearchQuery.trim()
      const hasFilters = trimmed || selectedRoles.length > 0
      const res = hasFilters
        ? await searchPersons({ 
            search: trimmed || undefined, 
            roles: selectedRoles.length > 0 ? selectedRoles : undefined,
            skip, 
            limit 
          })
        : await listPersons(skip, limit)
      setItems(res.items)
      setTotal(res.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [skip, limit, debouncedSearchQuery, selectedRoles])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleDelete = async (p: Person) => {
    try {
      await deletePerson(p.id)
      setDeleteTarget(null)
      fetchList()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const handleShowMovies = async (person: Person) => {
    setMovieModalPerson(person)
    setLoadingMovies(true)
    try {
      const movies = await getPersonMovies(person.id)
      setPersonMovies(movies)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load movies')
    } finally {
      setLoadingMovies(false)
    }
  }

  const toggleRole = (role: MovieRole) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
    setSkip(0)
  }

  const clearRoleFilter = () => {
    setSelectedRoles([])
    setSkip(0)
  }

  const currentPage = Math.floor(skip / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : skip + 1
  const to = Math.min(skip + limit, total)

  return (
    <div className="max-w-6xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-5">
        <Link to="/admin" className="hover:text-gray-700 transition-colors">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-gray-800 font-medium">Manage Professionals</span>
      </nav>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <button
          type="button"
          onClick={() => setFormPerson({ id: 0, name: '', email: '', created_at: '', updated_at: '' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm transition-colors"
        >
          <span>+</span> ADD NEW
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        
        {/* Role Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-sm"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-gray-700">
              {selectedRoles.length === 0 ? 'Filter by Role' : `${selectedRoles.length} Role${selectedRoles.length > 1 ? 's' : ''}`}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {roleDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-2">
                  <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200 mb-2">
                    <span className="text-sm font-medium text-gray-700">Select Roles</span>
                    {selectedRoles.length > 0 && (
                      <button
                        type="button"
                        onClick={clearRoleFilter}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  {MOVIE_ROLES.map((role) => (
                    <label
                      key={role.value}
                      className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.value)}
                        onChange={() => toggleRole(role.value)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{role.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
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

      {/* Active Filters */}
      {selectedRoles.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Active Filters:</span>
          {selectedRoles.map(roleValue => {
            const role = MOVIE_ROLES.find(r => r.value === roleValue)
            return role ? (
              <span
                key={roleValue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {role.label}
                <button
                  type="button"
                  onClick={() => toggleRole(roleValue)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${role.label} filter`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ) : null
          })}
          <button
            type="button"
            onClick={clearRoleFilter}
            className="text-sm text-gray-600 hover:text-gray-800 underline ml-2"
          >
            Clear all filters
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">First name</th>
              <th className="px-4 py-3 text-left font-medium">Last name</th>
              <th className="px-4 py-3 text-left font-medium">Movies</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500">No results</td></tr>
            ) : (
              items.map((person, i) => (
                <tr
                  key={person.id}
                  className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/professionals/${person.id}`} className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center justify-center" title="View" aria-label="View">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </Link>
                      <button type="button" onClick={() => setFormPerson(person)} className="p-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors inline-flex items-center justify-center" title="Edit" aria-label="Edit">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button type="button" onClick={() => setDeleteTarget(person)} className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors inline-flex items-center justify-center" title="Delete" aria-label="Delete">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">{person.name.split(' ')[0] ?? person.name}</td>
                  <td className="px-4 py-3">{person.name.split(' ').slice(1).join(' ') || '—'}</td>
                  <td className="px-4 py-3">
                    {person.movie_count != null && person.movie_count > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleShowMovies(person)}
                        className="text-blue-600 hover:text-blue-800 font-medium underline"
                      >
                        {person.movie_count} {person.movie_count === 1 ? 'movie' : 'movies'}
                      </button>
                    ) : (
                      <span className="text-gray-500">0 movies</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/professionals/${person.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Show &gt;</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center gap-4 mt-5 text-sm">
        <span className="text-gray-500">Page</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(6, totalPages) }, (_, i) => {
            const p = i + 1
            const isCurrent = p === currentPage
            return (
              <button
                key={p}
                type="button"
                onClick={() => setSkip((p - 1) * limit)}
                className={`min-w-[2rem] h-8 px-2 rounded-lg text-sm font-medium transition-colors ${isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {p}
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => setSkip(Math.min(skip + limit, (totalPages - 1) * limit))} disabled={currentPage >= totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none">&gt;</button>
        <button type="button" onClick={() => setSkip((totalPages - 1) * limit)} disabled={currentPage >= totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none">&gt;&gt;</button>
        <span className="text-gray-500">Results {from} to {to} of {total}</span>
      </div>

      {formPerson && (
        <ActorFormModal
          person={formPerson}
          onClose={() => setFormPerson(null)}
          onSaved={() => {
            setFormPerson(null)
            fetchList()
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete professional?"
          message={`Delete ${deleteTarget.name}?`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      
      {movieModalPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Movies for {movieModalPerson.name}
            </h2>
            {loadingMovies ? (
              <p className="text-gray-500 text-center py-4">Loading movies...</p>
            ) : personMovies.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No movies found.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {personMovies.map((movie) => (
                  <div
                    key={`${movie.movie_id}-${movie.role}`}
                    className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded"
                  >
                    <div>
                      <Link
                        to={`/admin/movies/${movie.movie_id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {movie.movie_title}
                      </Link>
                      <span className="text-gray-500 text-sm ml-2">({movie.role})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={() => {
                  setMovieModalPerson(null)
                  setPersonMovies([])
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
