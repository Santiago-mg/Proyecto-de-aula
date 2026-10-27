import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

interface ToastContextValue {
  showToast(message: string): void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <div
          style={{
            position: 'fixed',
            top: 96,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 300,
            padding: '12px 28px',
            background: 'var(--ink)',
            color: 'var(--bg)',
            borderRadius: 999,
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            boxShadow: '0 16px 48px -8px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
