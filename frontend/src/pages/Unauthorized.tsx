import { Link } from 'react-router-dom'

export function Unauthorized() {
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
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          marginBottom: 12,
        }}
      >
        Acceso no autorizado
      </h1>
      <p style={{ color: 'var(--ink-soft)', marginBottom: 32 }}>
        No tienes permisos para ver esta página.
      </p>
      <Link to="/" className="cp-btn cp-btn-primary">
        Volver al inicio
      </Link>
    </div>
  )
}
