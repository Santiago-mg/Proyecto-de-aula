import { useEffect, useState } from 'react'

/**
 * Retrasa la actualización de un valor hasta que el usuario deje de escribir.
 * Útil para evitar llamadas a la API en cada tecla del buscador.
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
