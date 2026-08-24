import { X, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../context/CartContext'

function formatCOP(n: number) {
  return (
    '$' +
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) +
    ' COP'
  )
}

interface CartDrawerProps {
  open: boolean
  onClose(): void
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateQty, clearCart } = useCart()
  const navigate = useNavigate()

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const shipping = subtotal > 500000 || subtotal === 0 ? 0 : 20000
  const total = subtotal + shipping

  function goToCheckout() {
    onClose()
    navigate('/checkout')
  }

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="cp-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div className={`cp-drawer ${open ? 'open' : ''}`} role="dialog" aria-label="Carrito">
        <div className="cp-drawer-header">
          <h2 className="cp-drawer-title">
            Carrito{' '}
            <span style={{ color: 'var(--accent)' }}>
              ({cart.length})
            </span>
          </h2>
          <button className="cp-icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cp-drawer-empty">
            <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
            <p>Tu carrito está vacío</p>
            <button
              className="cp-btn cp-btn-primary"
              onClick={() => { onClose(); navigate('/catalog') }}
            >
              Ver celulares
            </button>
          </div>
        ) : (
          <>
            <div className="cp-drawer-items">
              {cart.map((item) => (
                <div key={item.key} className="cp-drawer-item">
                  {item.heroImage && (
                    <img
                      src={item.heroImage}
                      alt={item.name}
                      className="cp-drawer-item-img"
                    />
                  )}
                  <div className="cp-drawer-item-info">
                    <div className="cp-drawer-item-name">{item.name}</div>
                    <div className="cp-drawer-item-color">
                      {item.colorName}
                    </div>
                    <div className="cp-drawer-item-price">
                      {formatCOP(item.price)}
                    </div>
                    <div className="cp-drawer-item-controls">
                      <button
                        className="cp-qty-btn"
                        onClick={() => updateQty(item.key, item.qty - 1)}
                        disabled={item.qty <= 1}
                      >
                        −
                      </button>
                      <span className="cp-qty-value">{item.qty}</span>
                      <button
                        className="cp-qty-btn"
                        onClick={() => updateQty(item.key, item.qty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    className="cp-icon-btn"
                    onClick={() => removeFromCart(item.key)}
                    aria-label="Eliminar"
                    style={{ alignSelf: 'flex-start', color: 'var(--ink-soft)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cp-drawer-footer">
              <div className="cp-drawer-totals">
                <div className="cp-drawer-row">
                  <span>Subtotal</span>
                  <span>{formatCOP(subtotal)}</span>
                </div>
                <div className="cp-drawer-row">
                  <span>Envío</span>
                  <span>
                    {shipping === 0 ? '¡Gratis!' : formatCOP(shipping)}
                  </span>
                </div>
                <div className="cp-drawer-row cp-drawer-total">
                  <span>Total</span>
                  <span>{formatCOP(total)}</span>
                </div>
              </div>
              <button
                className="cp-btn cp-btn-primary"
                style={{ width: '100%' }}
                onClick={goToCheckout}
              >
                Proceder al pago →
              </button>
              <button
                className="cp-btn cp-btn-ghost"
                style={{ width: '100%', marginTop: 8 }}
                onClick={clearCart}
              >
                Vaciar carrito
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
