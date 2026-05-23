import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MenuDrawer } from './MenuDrawer'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <Topbar onMenuClick={() => setMenuOpen(true)} />
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="w-full px-2 py-6 sm:px-3 lg:px-4 xl:px-5">
        <Outlet />
      </main>
    </div>
  )
}
