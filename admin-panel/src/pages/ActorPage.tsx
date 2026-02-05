import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listPersons, searchPersons, deletePerson } from '@/api/persons'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Person } from '@/types/person'
import { ActorFormModal } from '@/components/actor/ActorFormModal'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'

export function ActorPage() {
  const [items, setItems] = useState<Person[]>([])
  const [total, setTotal] = useState(0)
  const [skip, setSkip] = useState(0)
  const [limit, setLimit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 400, () => setSkip(0))
  const [formPerson, setFormPerson] = useState<Person | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const trimmed = debouncedSearchQuery.trim()
      const res = trimmed
        ? await searchPersons({ search: trimmed, skip, limit })
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
  }, [skip, limit, debouncedSearchQuery])

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

  const currentPage = Math.floor(skip / limit) + 1
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : skip + 1
  const to = Math.min(skip + limit, total)

  return (
    <div className="max-w-6xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-gray-500 mb-5">
        <Link to="/actor" className="hover:text-gray-700 transition-colors">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-gray-800 font-medium">Actor</span>
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

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">First name</th>
              <th className="px-4 py-3 text-left font-medium">Last name</th>
              <th className="px-4 py-3 text-left font-medium">Film</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-500">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-500">No results</td></tr>
            ) : (
              items.map((person, i) => (
                <tr
                  key={person.id}
                  className={`border-t border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/actor/${person.id}`} className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center justify-center" title="View" aria-label="View">
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
                    <Link to={`/actor/${person.id}`} className="text-blue-600 hover:text-blue-800 font-medium">Show &gt;</Link>
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
          title="Delete actor?"
          message={`Delete ${deleteTarget.name}?`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
