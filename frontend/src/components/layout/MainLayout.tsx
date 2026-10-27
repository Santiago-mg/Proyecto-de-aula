import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { CartDrawer } from '../cart/CartDrawer'
import { PromoBar } from '../ui/PromoBar'
import { Footer } from './Footer'
import { Nav } from './Nav'

export function MainLayout() {
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <>
      <PromoBar />
      <Nav onOpenCart={() => setCartOpen(true)} />
      <main className="cp-main">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
