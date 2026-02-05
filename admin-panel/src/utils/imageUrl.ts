/**
 * Get the full URL for a movie image
 */
export function getImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  
  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
  // Remove /api suffix if present
  const baseUrl = API_BASE.replace(/\/api$/, '')
  
  return `${baseUrl}/static/uploads/${imagePath}`
}
