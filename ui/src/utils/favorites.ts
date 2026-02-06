// Favorites/Watch Later utility functions using localStorage

const FAVORITES_KEY = 'moviedb_watchlater';

export interface WatchLaterMovie {
  id: number;
  title: string;
  image_path: string | null;
  rating: number | null;
  release_date: string | null;
  genres: number[];
  addedAt: string;
}

/**
 * Get all watch later movies from localStorage
 */
export function getWatchLater(): WatchLaterMovie[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading watch later from localStorage:', error);
    return [];
  }
}

/**
 * Add a movie to watch later
 */
export function addToWatchLater(movie: Omit<WatchLaterMovie, 'addedAt'>): void {
  try {
    const current = getWatchLater();
    // Don't add if already exists
    if (current.some(m => m.id === movie.id)) {
      return;
    }
    const updated = [...current, { ...movie, addedAt: new Date().toISOString() }];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding to watch later:', error);
  }
}

/**
 * Remove a movie from watch later
 */
export function removeFromWatchLater(movieId: number): void {
  try {
    const current = getWatchLater();
    const updated = current.filter(m => m.id !== movieId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing from watch later:', error);
  }
}

/**
 * Check if a movie is in watch later
 */
export function isInWatchLater(movieId: number): boolean {
  try {
    const current = getWatchLater();
    return current.some(m => m.id === movieId);
  } catch (error) {
    console.error('Error checking watch later status:', error);
    return false;
  }
}

/**
 * Clear all watch later movies
 */
export function clearWatchLater(): void {
  try {
    localStorage.removeItem(FAVORITES_KEY);
  } catch (error) {
    console.error('Error clearing watch later:', error);
  }
}

/**
 * Get count of watch later movies
 */
export function getWatchLaterCount(): number {
  return getWatchLater().length;
}
