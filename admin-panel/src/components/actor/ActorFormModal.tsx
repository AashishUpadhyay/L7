import { useState, useEffect } from 'react'
import { createPerson, updatePerson } from '@/api/persons'
import type { Person } from '@/types/person'

interface ActorFormModalProps {
  person: Person | { id: 0; name: string; email: string; created_at?: string; updated_at?: string }
  onClose: () => void
  onSaved: () => void
}

export function ActorFormModal({ person, onClose, onSaved }: ActorFormModalProps) {
  const [name, setName] = useState(person.name)
  const [email, setEmail] = useState(person.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNew = person.id === 0

  useEffect(() => {
    setName(person.name)
    setEmail(person.email)
  }, [person])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (isNew) {
        await createPerson({ name, email })
      } else {
        await updatePerson(person.id, { name, email })
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">{isNew ? 'Add new actor' : 'Edit actor'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                type="text"
                value={name.split(' ')[0] ?? ''}
                onChange={(e) => {
                  const rest = name.split(' ').slice(1).join(' ')
                  setName(rest ? `${e.target.value} ${rest}` : e.target.value)
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input
                type="text"
                value={name.split(' ').slice(1).join(' ')}
                onChange={(e) => {
                  const first = name.split(' ')[0] ?? ''
                  setName(first ? `${first} ${e.target.value}` : e.target.value)
                }}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
