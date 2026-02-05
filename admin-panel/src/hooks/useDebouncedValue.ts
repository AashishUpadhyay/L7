import { useState, useEffect, useRef } from 'react'

const DEBOUNCE_MS = 400

/**
 * Returns a value that updates only after the input has been stable for DEBOUNCE_MS.
 * Optional onSettled is called in the same timer tick as the state update (e.g. to reset pagination).
 */
export function useDebouncedValue<T>(
  value: T,
  delayMs: number = DEBOUNCE_MS,
  onSettled?: () => void
): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  const onSettledRef = useRef(onSettled)
  onSettledRef.current = onSettled

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedValue(value)
      onSettledRef.current?.()
    }, delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])

  return debouncedValue
}
