import { useState, useEffect } from 'react'
import { createMovie, updateMovie } from '@/api/movies'
import { GENRES } from '@/types/movie'
import type { Movie, MovieCreate } from '@/types/movie'

interface FilmFormModalProps {
  movie: Movie | { id: 0; title: string; description: string | null; release_date: string | null; genres: number[]; rating: number | null; created_at?: string; updated_at?: string }
  onClose: () => void
  onSaved: () => void
}

export function FilmFormModal({ movie, onClose, onSaved }: FilmFormModalProps) {
  const [title, setTitle] = useState(movie.title)
  const [description, setDescription] = useState(movie.description ?? '')
  const [releaseDate, setReleaseDate] = useState(
    movie.release_date ? movie.release_date.toString().slice(0, 10) : ''
  )
  const [genres, setGenres] = useState<number[]>(Array.isArray(movie.genres) ? [...movie.genres] : [])
  const [rating, setRating] = useState<string>(
    movie.rating != null ? String(movie.rating) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNew = movie.id === 0

  useEffect(() => {
    setTitle(movie.title)
    setDescription(movie.description ?? '')
    setReleaseDate(movie.release_date ? String(movie.release_date).slice(0, 10) : '')
    setGenres(Array.isArray(movie.genres) ? [...movie.genres] : [])
    setRating(movie.rating != null ? String(movie.rating) : '')
  }, [movie])

  function toggleGenre(value: number) {
    setGenres((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (genres.length === 0) {
      setError('Select at least one genre')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const ratingVal = rating === '' ? null : parseFloat(rating)
      const payload: MovieCreate = {
        title,
        description: description || null,
        release_date: releaseDate || null,
        genres,
        rating: ratingVal,
      }
      if (isNew) {
        await createMovie(payload)
      } else {
        await updateMovie(movie.id, payload)
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 my-8">
        <h2 className="text-lg font-semibold mb-4">{isNew ? 'Add new film' : 'Edit film'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="film-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                id="film-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label htmlFor="film-description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id="film-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="film-release-date" className="block text-sm font-medium text-gray-700 mb-1">Release date</label>
              <input
                id="film-release-date"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Genres (at least one)</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <label key={g.value} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={genres.includes(g.value)}
                      onChange={() => toggleGenre(g.value)}
                      className="rounded"
                    />
                    <span className="text-sm">{g.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="film-rating" className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <input
                id="film-rating"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Optional"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
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
