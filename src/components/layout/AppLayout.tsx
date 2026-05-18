import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-gray-950">
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="min-w-0 flex-1">
          <Topbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
