import { Outlet } from 'react-router-dom'
import { Topbar } from './Topbar'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-transparent text-gray-950">
      <Topbar />
      <main className="mx-auto w-full max-w-[1800px] px-2 py-4 sm:px-3 lg:px-4 xl:px-5">
        <Outlet />
      </main>
    </div>
  )
}
