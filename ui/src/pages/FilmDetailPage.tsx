import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getMovie, deleteMovie } from '@/api/movies'
import { getImageUrl } from '@/utils/imageUrl'
import { GENRES } from '@/types/movie'
import type { Movie } from '@/types/movie'
import { FilmFormModal } from '@/components/film/FilmFormModal'
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal'

function genreLabels(genres: number[]) {
  return genres
    .map((g) => GENRES.find((x) => x.value === g)?.label ?? g)
    .join(', ') || '—'
}

export function FilmDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    getMovie(Number(id))
      .then((m) => {
        if (!cancelled) setMovie(m)
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
    if (!movie) return
    try {
      await deleteMovie(movie.id)
      setDeleteConfirm(false)
      navigate('/admin/movies')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (loading) return <div className="text-gray-500">Loading…</div>
  if (error || !movie) return <div className="text-red-600">{error ?? 'Not found'}</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <Link to="/admin" className="hover:text-gray-900">🏠 Home</Link>
        <span>/</span>
        <Link to="/admin/movies" className="hover:text-gray-900">Manage Movies</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{movie.title}</span>
      </nav>
      <div className="bg-white rounded shadow p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">{movie.title}</h1>
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
        {movie.image_path && (
          <div className="mb-4">
            <img
              src={getImageUrl(movie.image_path) || ''}
              alt={movie.title}
              className="w-48 h-64 object-cover rounded border"
            />
          </div>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-2 text-sm">
          <dt className="text-gray-600">Film id</dt>
          <dd>{movie.id}</dd>
          <dt className="text-gray-600">Description</dt>
          <dd>{movie.description ?? '—'}</dd>
          <dt className="text-gray-600">Release date</dt>
          <dd>{movie.release_date ?? '—'}</dd>
          <dt className="text-gray-600">Genres</dt>
          <dd>{genreLabels(movie.genres)}</dd>
          <dt className="text-gray-600">Rating</dt>
          <dd>{movie.rating ?? '—'}</dd>
          <dt className="text-gray-600">Last update</dt>
          <dd>{new Date(movie.updated_at).toLocaleString()}</dd>
        </dl>
      </div>
      {editing && (
        <FilmFormModal
          movie={movie}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            getMovie(movie.id).then(setMovie)
          }}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal
          title="Delete film?"
          message={`Delete "${movie.title}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  )
}
