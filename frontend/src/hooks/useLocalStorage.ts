import { useState } from 'react'

/**
 * Persiste un valor en localStorage y lo sincroniza con el estado de React.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  function setValue(value: T | ((prev: T) => T)) {
    const next = value instanceof Function ? value(storedValue) : value
    setStoredValue(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  function removeValue() {
    setStoredValue(initialValue)
    localStorage.removeItem(key)
  }

  return [storedValue, setValue, removeValue] as const
}
