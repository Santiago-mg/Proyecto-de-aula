import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { CartItem } from '../types/order'
import type { PhoneColor, PhoneListItem } from '../types/phone'

interface CartContextValue {
  cart: CartItem[]
  totalItems: number
  addToCart(phone: PhoneListItem, color: PhoneColor, qty?: number): void
  removeFromCart(key: string): void
  updateQty(key: string, qty: number): void
  clearCart(): void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('cp_cart')
      return stored ? (JSON.parse(stored) as CartItem[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('cp_cart', JSON.stringify(cart))
  }, [cart])

  function addToCart(phone: PhoneListItem, color: PhoneColor, qty = 1) {
    const key = `${phone.id}-${color.colorId}`
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key)
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, qty: i.qty + qty } : i,
        )
      }
      return [
        ...prev,
        {
          key,
          phoneId: phone.id,
          name: phone.name,
          heroImage: phone.heroImage,
          price: phone.price,
          qty,
          colorId: color.colorId,
          colorName: color.name,
        },
      ]
    })
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((i) => i.key !== key))
  }

  function updateQty(key: string, qty: number) {
    if (qty < 1) return
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)))
  }

  function clearCart() {
    setCart([])
  }

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider
      value={{ cart, totalItems, addToCart, removeFromCart, updateQty, clearCart }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider')
  return ctx
}
