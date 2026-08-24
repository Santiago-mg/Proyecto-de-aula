import axios from 'axios'

interface ErrorMessageProps {
  error: Error | null
}

function getErrorText(error: Error | null): string {
  if (!error) return ''
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string })?.error ??
      'Error de conexión con el servidor'
    )
  }
  return error.message
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  return (
    <p
      style={{
        color: '#e05252',
        fontSize: 13,
        fontFamily: 'var(--font-mono)',
        margin: '8px 0 0',
        letterSpacing: '0.04em',
      }}
    >
      {getErrorText(error)}
    </p>
  )
}
