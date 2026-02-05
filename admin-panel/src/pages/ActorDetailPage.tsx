import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getPerson, deletePerson } from '@/api/persons'
import type { Person } from '@/types/person'
import { ActorFormModal } from '@/components/actor/ActorFormModal'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'

export function ActorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [person, setPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    getPerson(Number(id))
      .then((p) => {
        if (!cancelled) setPerson(p)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleDelete = async () => {
    if (!person) return
    try {
      await deletePerson(person.id)
      setDeleteConfirm(false)
      navigate('/actor')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>
  if (error || !person) return <div className="text-red-600">{error ?? 'Not found'}</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Link to="/" className="hover:text-gray-900">🏠 Home</Link>
        <span>/</span>
        <Link to="/actor" className="hover:text-gray-900">Actor</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{person.name}</span>
      </nav>
      <div className="bg-white rounded shadow p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Actor #{person.id}</h1>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Delete
            </button>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-2 text-sm">
          <dt className="text-gray-600">Actor id</dt>
          <dd>{person.id}</dd>
          <dt className="text-gray-600">Name</dt>
          <dd>{person.name}</dd>
          <dt className="text-gray-600">Email</dt>
          <dd>{person.email}</dd>
          <dt className="text-gray-600">Last update</dt>
          <dd>{new Date(person.updated_at).toLocaleString()}</dd>
        </dl>
      </div>
      {editing && (
        <ActorFormModal
          person={person}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            getPerson(person.id).then(setPerson)
          }}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete actor?"
          message={`Delete ${person.name}?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
