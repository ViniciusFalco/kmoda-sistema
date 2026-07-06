import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function PrivateRoute() {
  const { user, profile, loading, authReady } = useAuth()
  const location = useLocation()

  if (loading || !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-gray-500">
        Carregando sessão...
      </div>
    )
  }

  if (!user || !profile || profile.active === false) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
