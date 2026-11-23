import { useState, useEffect, useCallback } from 'react'

/**
 * Persistenter State mit localStorage.
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 */
export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    setStoredValue(prev => {
      const next = value instanceof Function ? value(prev) : value
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch { /* Speicher voll */ }
      return next
    })
  }, [key])

  const removeValue = useCallback(() => {
    setStoredValue(initialValue)
    try { window.localStorage.removeItem(key) } catch { /* ignore */ }
  }, [key, initialValue])

  // Synchronisation bei localStorage-Änderungen (andere Tabs)
  useEffect(() => {
    const handler = () => {
      try {
        const item = window.localStorage.getItem(key)
        if (item !== null) setStoredValue(JSON.parse(item))
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key])

  return [storedValue, setValue, removeValue]
}
