import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MenuDrawer } from './MenuDrawer'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-gray-950">
      <Topbar onMenuClick={() => setMenuOpen(true)} />
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
