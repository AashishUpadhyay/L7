import { useState, useEffect } from 'react'
import { createMovie, updateMovie, getMoviePersons, addPersonsToMovie, removePersonFromMovie, uploadMovieImage } from '@/api/movies'
import { listPersons, createPerson } from '@/api/persons'
import { GENRES } from '@/types/movie'
import { MOVIE_ROLES } from '@/types/moviePerson'
import { getImageUrl } from '@/utils/imageUrl'
import type { Movie, MovieCreate } from '@/types/movie'
import type { Person, PersonCreate } from '@/types/person'
import type { PersonInMovie, MovieRole, AddPersonToMovieRequest } from '@/types/moviePerson'

interface FilmFormModalProps {
  movie: Movie | { id: 0; title: string; description: string | null; release_date: string | null; genres: number[]; rating: number | null; image_path?: string | null; created_at?: string; updated_at?: string }
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
  
  // Person management state
  const [persons, setPersons] = useState<Person[]>([])
  const [assignedPersons, setAssignedPersons] = useState<PersonInMovie[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<number | ''>('')
  const [selectedRole, setSelectedRole] = useState<MovieRole>('Actor')
  const [loadingPersons, setLoadingPersons] = useState(false)
  
  // New person creation state
  const [showNewPersonForm, setShowNewPersonForm] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonEmail, setNewPersonEmail] = useState('')
  const [creatingPerson, setCreatingPerson] = useState(false)
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const isNew = movie.id === 0

  useEffect(() => {
    setTitle(movie.title)
    setDescription(movie.description ?? '')
    setReleaseDate(movie.release_date ? String(movie.release_date).slice(0, 10) : '')
    setGenres(Array.isArray(movie.genres) ? [...movie.genres] : [])
    setRating(movie.rating != null ? String(movie.rating) : '')
    
    if (isNew) {
      setPersons([])
      setAssignedPersons([])
      setLoadingPersons(false)
      return
    }

    // Load persons list and assigned persons for existing movie
    async function loadData() {
      setLoadingPersons(true)
      try {
        const [personsData, assignedData] = await Promise.all([
          listPersons(0, 100),
          getMoviePersons(movie.id),
        ])
        setPersons(personsData.items)
        setAssignedPersons(assignedData)
      } catch (err) {
        console.error('Failed to load persons:', err)
      } finally {
        setLoadingPersons(false)
      }
    }
    loadData()
  }, [movie, isNew])

  function toggleGenre(value: number) {
    setGenres((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    )
  }

  async function handleCreateNewPerson() {
    if (!newPersonName.trim() || !newPersonEmail.trim()) {
      setError('Name and email are required')
      return
    }
    
    setCreatingPerson(true)
    try {
      const payload: PersonCreate = {
        name: newPersonName.trim(),
        email: newPersonEmail.trim(),
      }
      
      const newPerson = await createPerson(payload)
      
      // Add to persons list
      setPersons([...persons, newPerson])
      
      // Auto-select the new person
      setSelectedPersonId(newPerson.id)
      
      // Reset form
      setNewPersonName('')
      setNewPersonEmail('')
      setShowNewPersonForm(false)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create person')
    } finally {
      setCreatingPerson(false)
    }
  }

  async function handleAddPerson() {
    if (selectedPersonId === '' || isNew) {
      return
    }
    
    try {
      const payload: AddPersonToMovieRequest[] = [{
        person_id: Number(selectedPersonId),
        role: selectedRole,
      }]
      
      await addPersonsToMovie(movie.id, payload)
      
      // Reload assigned persons
      const assignedData = await getMoviePersons(movie.id)
      setAssignedPersons(assignedData)
      
      // Reset selection
      setSelectedPersonId('')
      setSelectedRole('Actor')
      
      // Trigger parent refresh to update the grid
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add person')
    }
  }

  async function handleRemovePerson(personId: number, role: MovieRole) {
    if (isNew) return
    
    try {
      await removePersonFromMovie(movie.id, personId, role)
      
      // Reload assigned persons
      const assignedData = await getMoviePersons(movie.id)
      setAssignedPersons(assignedData)
      
      // Trigger parent refresh to update the grid
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove person')
    }
  }
  
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an image (JPEG, PNG, GIF, or WebP)')
      return
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB')
      return
    }
    
    setImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }
  
  async function handleImageUpload() {
    if (!imageFile || isNew) return
    
    setError(null)
    setUploadingImage(true)
    try {
      await uploadMovieImage(movie.id, imageFile)
      setImageFile(null)
      setImagePreview(null)
      onSaved() // Refresh parent to show new image
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
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

            {!isNew && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Movie Image</h3>
                
                {/* Current image */}
                {movie.image_path && !imagePreview && (
                  <div className="mb-3">
                    <img
                      src={getImageUrl(movie.image_path) || ''}
                      alt={movie.title}
                      className="w-32 h-48 object-cover rounded border"
                    />
                  </div>
                )}
                
                {/* Image preview */}
                {imagePreview && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">Preview:</p>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-48 object-cover rounded border"
                    />
                  </div>
                )}
                
                {/* Upload controls */}
                <div className="flex gap-2 items-start">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                    className="text-sm"
                    disabled={uploadingImage}
                  />
                  {imageFile && (
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      disabled={uploadingImage}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Supported: JPEG, PNG, GIF, WebP (max 10MB)
                </p>
              </div>
            )}

            {!isNew && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Manage People</h3>
                
                {/* Add person form */}
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedPersonId}
                    onChange={(e) => setSelectedPersonId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
                    disabled={loadingPersons}
                  >
                    <option value="">Select person...</option>
                    {persons.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as MovieRole)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    {MOVIE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddPerson}
                    disabled={selectedPersonId === '' || loadingPersons}
                    className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>

                {/* Create new person button */}
                {!showNewPersonForm && (
                  <button
                    type="button"
                    onClick={() => setShowNewPersonForm(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 mb-3"
                  >
                    + Create New Person
                  </button>
                )}

                {/* New person form */}
                {showNewPersonForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Create New Person</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newPersonEmail}
                        onChange={(e) => setNewPersonEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateNewPerson}
                          disabled={creatingPerson || !newPersonName.trim() || !newPersonEmail.trim()}
                          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {creatingPerson ? 'Creating...' : 'Create'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewPersonForm(false)
                            setNewPersonName('')
                            setNewPersonEmail('')
                          }}
                          className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assigned persons list */}
                <div className="space-y-1">
                  {assignedPersons.length === 0 ? (
                    <p className="text-sm text-gray-500">No people assigned yet.</p>
                  ) : (
                    assignedPersons.map((ap) => (
                      <div key={`${ap.person_id}-${ap.role}`} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                        <span>
                          <strong>{ap.person_name}</strong> - {ap.role}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePerson(ap.person_id, ap.role)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {isNew && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 italic">
                  Save the movie first to assign people to it.
                </p>
              </div>
            )}
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
