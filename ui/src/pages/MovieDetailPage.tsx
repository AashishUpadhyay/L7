import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getMovie, getMoviePersons, getMovieReviews, createMovieReview } from '@/api/movies'
import { getImageUrl } from '@/utils/imageUrl'
import { GENRES } from '@/types/movie'
import type { Movie } from '@/types/movie'
import type { PersonInMovie } from '@/types/moviePerson'
import type { Review, ReviewCreate } from '@/types/review'
import { addToWatchLater, removeFromWatchLater, isInWatchLater } from '@/utils/favorites'

function getGenreLabel(genreValue: number): string {
  return GENRES.find(g => g.value === genreValue)?.label ?? 'Unknown'
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

function formatYear(dateString: string | null): string {
  if (!dateString) return 'Unknown'
  try {
    return new Date(dateString).getFullYear().toString()
  } catch {
    return 'Unknown'
  }
}

export function MovieDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [persons, setPersons] = useState<PersonInMovie[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsTotal, setReviewsTotal] = useState(0)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inWatchLater, setInWatchLater] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [newReview, setNewReview] = useState<ReviewCreate>({
    author_name: '',
    rating: 8,
    content: '',
  })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [movieData, personsData, reviewsData] = await Promise.all([
          getMovie(Number(id)),
          getMoviePersons(Number(id)),
          getMovieReviews(Number(id), 0, 10)
        ])
        setMovie(movieData)
        setPersons(personsData)
        setReviews(reviewsData.items)
        setReviewsTotal(reviewsData.total)
        setAverageRating(reviewsData.average_rating)
        setInWatchLater(isInWatchLater(Number(id)))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load movie')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !newReview.author_name.trim() || !newReview.content.trim()) return

    setSubmittingReview(true)
    try {
      const createdReview = await createMovieReview(Number(id), newReview)
      setReviews(prev => [createdReview, ...prev])
      setReviewsTotal(prev => prev + 1)
      setNewReview({ author_name: '', rating: 8, content: '' })
      setShowReviewForm(false)
      
      // Refresh reviews to get updated average
      const reviewsData = await getMovieReviews(Number(id), 0, 10)
      setAverageRating(reviewsData.average_rating)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleWatchLaterToggle = () => {
    if (!movie) return
    
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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    )
  }

  if (error || !movie) {
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
            <p className="text-red-400 text-lg">{error || 'Movie not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const imageUrl = movie.image_path ? getImageUrl(movie.image_path) : null
  const directors = persons.filter(p => p.role === 'Director')
  const actors = persons.filter(p => p.role === 'Actor')
  const producers = persons.filter(p => p.role === 'Producer')

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

      {/* Movie Details */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Poster */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={movie.title}
                  className="w-full rounded-lg shadow-2xl"
                />
              ) : (
                <div className="aspect-[2/3] bg-gray-800 rounded-lg flex items-center justify-center text-gray-600">
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              )}
              
              {/* Watch Later Button */}
              <button
                onClick={handleWatchLaterToggle}
                className={`w-full mt-4 py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                  inWatchLater
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                }`}
              >
                <svg className="w-5 h-5" fill={inWatchLater ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                {inWatchLater ? 'Remove from Watch Later' : 'Add to Watch Later'}
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="lg:col-span-2">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">{movie.title}</h1>
            
            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {movie.rating !== null && (
                <div className="flex items-center gap-2 bg-yellow-500/20 px-3 py-1.5 rounded-full">
                  <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  <span className="text-yellow-500 font-bold text-lg">{movie.rating.toFixed(1)}</span>
                </div>
              )}
              <span className="text-gray-400 text-lg">{formatYear(movie.release_date)}</span>
              {movie.genres.map(genre => (
                <span key={genre} className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-full text-sm">
                  {getGenreLabel(genre)}
                </span>
              ))}
            </div>

            {/* Description */}
            {movie.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-white mb-3">Overview</h2>
                <p className="text-gray-300 text-lg leading-relaxed">{movie.description}</p>
              </div>
            )}

            {/* Release Date */}
            {movie.release_date && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">Release Date</h3>
                <p className="text-gray-300">{formatDate(movie.release_date)}</p>
              </div>
            )}

            {/* Cast & Crew */}
            {(directors.length > 0 || actors.length > 0 || producers.length > 0) && (
              <div className="space-y-6 mb-8">
                {directors.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">
                      Director{directors.length > 1 ? 's' : ''}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {directors.map(director => (
                        <Link
                          key={director.id}
                          to={`/person/${director.person_id}`}
                          className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500 hover:bg-gray-700 transition-all duration-200"
                        >
                          <p className="text-gray-200 font-medium hover:text-red-400 transition-colors">{director.person_name}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {actors.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Cast</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {actors.map(actor => (
                        <Link
                          key={actor.id}
                          to={`/person/${actor.person_id}`}
                          className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500 hover:bg-gray-700 transition-all duration-200"
                        >
                          <p className="text-gray-200 hover:text-red-400 transition-colors">{actor.person_name}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {producers.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">
                      Producer{producers.length > 1 ? 's' : ''}
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {producers.map(producer => (
                        <Link
                          key={producer.id}
                          to={`/person/${producer.person_id}`}
                          className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-red-500 hover:bg-gray-700 transition-all duration-200"
                        >
                          <p className="text-gray-200 hover:text-red-400 transition-colors">{producer.person_name}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reviews Section */}
            <div className="border-t border-gray-700 pt-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Reviews</h2>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-gray-400">
                      {reviewsTotal} {reviewsTotal === 1 ? 'review' : 'reviews'}
                    </p>
                    {averageRating !== null && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="text-yellow-500 font-medium">{averageRating.toFixed(1)} average</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  {showReviewForm ? 'Cancel' : 'Write Review'}
                </button>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <form onSubmit={handleSubmitReview} className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="author_name" className="block text-sm font-medium text-gray-300 mb-2">
                        Your Name
                      </label>
                      <input
                        id="author_name"
                        type="text"
                        value={newReview.author_name}
                        onChange={(e) => setNewReview({ ...newReview, author_name: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Enter your name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="rating" className="block text-sm font-medium text-gray-300 mb-2">
                        Rating: {newReview.rating.toFixed(1)}/10
                      </label>
                      <input
                        id="rating"
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={newReview.rating}
                        onChange={(e) => setNewReview({ ...newReview, rating: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-300 mb-2">
                        Your Review
                      </label>
                      <textarea
                        id="content"
                        value={newReview.content}
                        onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px]"
                        placeholder="Write your review here..."
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-white">{review.author_name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                              <span className="text-yellow-500 font-medium">{review.rating.toFixed(1)}/10</span>
                            </div>
                            <span className="text-gray-500 text-sm">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{review.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
                  <p className="text-gray-400">No reviews yet. Be the first to review this movie!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
