import { ShoppingBag, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

interface NavProps {
  onOpenCart(): void
}

export function Nav({ onOpenCart }: NavProps) {
  const { user, logout } = useAuth()
  const { totalItems } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const links = [
    { label: 'Tienda', to: '/catalog' },
    { label: 'Nuevos', to: '/catalog?condition=NEW' },
    { label: 'Certificados', to: '/catalog?condition=CERTIFIED' },
    { label: 'iPhone', to: '/catalog?category=apple' },
    { label: 'Samsung', to: '/catalog?category=samsung' },
  ]

  return (
    <header className="cp-nav">
      <div className="cp-container cp-nav-inner">
        {/* Logo */}
        <Link to="/" className="cp-logo">
          Celular<span>Pro</span>
          <span className="cp-logo-badge">✓</span>
        </Link>

        {/* Links desktop */}
        <nav className="cp-nav-links">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`cp-nav-link ${location.pathname + location.search === l.to ? 'active' : ''}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Acciones */}
        <div className="cp-nav-actions">
          {user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link to="/admin/phones" className="cp-nav-link">
                  Admin
                </Link>
              )}
              <Link to="/dashboard" className="cp-nav-link">
                {user.name.split(' ')[0]}
              </Link>
              <button className="cp-btn cp-btn-ghost" onClick={handleLogout}>
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="cp-nav-link">
                Ingresar
              </Link>
              <Link to="/register" className="cp-btn cp-btn-primary">
                Registrarse
              </Link>
            </>
          )}

          <button
            className="cp-icon-btn"
            onClick={onOpenCart}
            aria-label="Carrito"
          >
            <ShoppingBag size={18} />
            {totalItems > 0 && (
              <span className="cp-cart-badge">{totalItems}</span>
            )}
          </button>

          <button
            className="cp-icon-btn cp-show-mobile"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menú"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menú móvil */}
      {mobileOpen && (
        <div className="cp-mobile-menu">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="cp-mobile-link"
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <hr className="cp-mobile-divider" />
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="cp-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                Mi cuenta
              </Link>
              <button className="cp-mobile-link" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="cp-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                Ingresar
              </Link>
              <Link
                to="/register"
                className="cp-mobile-link"
                onClick={() => setMobileOpen(false)}
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  )
}
