import {
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/phones', label: 'Celulares', icon: Package },
  { to: '/admin/orders', label: 'Órdenes', icon: ShoppingCart },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/stats', label: 'Estadísticas', icon: BarChart3 },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function isActive(to: string, exact?: boolean) {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return (
    <div className="cp-admin-layout">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="cp-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{ zIndex: 98 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`cp-admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="cp-admin-sidebar-header">
          <Link to="/admin" className="cp-admin-brand">
            <span className="cp-admin-brand-icon">⬡</span>
            <div>
              <div className="cp-admin-brand-name">CelularPro</div>
              <div className="cp-admin-brand-sub">Panel de control</div>
            </div>
          </Link>
          <button
            className="cp-icon-btn cp-show-mobile"
            onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: 'auto' }}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="cp-admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`cp-admin-nav-item ${isActive(item.to, item.exact) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
              <ChevronRight size={14} className="cp-admin-nav-arrow" />
            </Link>
          ))}
        </nav>

        <div className="cp-admin-sidebar-footer">
          <div className="cp-admin-user-info">
            <div className="cp-admin-user-avatar">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="cp-admin-user-name">{user?.name}</div>
              <div className="cp-admin-user-role">Administrador</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Link to="/" className="cp-btn cp-btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>
              Ver tienda
            </Link>
            <button className="cp-btn cp-btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }} onClick={handleLogout}>
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Contenido */}
      <div className="cp-admin-content">
        {/* Top bar móvil */}
        <div className="cp-admin-topbar">
          <button
            className="cp-icon-btn"
            onClick={() => setSidebarOpen(true)}
          >
            <LayoutDashboard size={18} />
          </button>
          <span className="cp-admin-topbar-title">
            {NAV_ITEMS.find((i) => isActive(i.to, i.exact))?.label ?? 'Admin'}
          </span>
        </div>

        <main className="cp-admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
