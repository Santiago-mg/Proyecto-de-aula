import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 72,
          fontWeight: 400,
          color: 'var(--accent)',
          lineHeight: 1,
          marginBottom: 16,
        }}
      >
        404
      </div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}
      >
        Página no encontrada
      </h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32 }}>
        La URL que buscas no existe o fue movida.
      </p>
      <Link to="/" className="cp-btn cp-btn-primary">
        Volver al inicio
      </Link>
    </div>
  )
}
