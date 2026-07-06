import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../features/auth/LoginPage'
import { CashPage } from '../features/cash/CashPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { PinRecoveryPage } from '../features/auth/PinRecoveryPage'
import { ProductsPage } from '../features/products/ProductsPage'
import { PromissoriesPage } from '../features/promissories/PromissoriesPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TutorialsPage } from '../features/tutorials/TutorialsPage'
import { StockPage } from '../features/stock/StockPage'
import { UsersPage } from '../features/users/UsersPage'
import { AuthProvider, useAuth } from '../hooks/useAuth'
import { PrivateRoute } from './PrivateRoute'
import { NotFoundPage } from './NotFoundPage'
import type { ReactNode } from 'react'

function RoleLanding() {
  const { profile } = useAuth()
  return profile?.role === 'admin' ? <DashboardPage /> : <Navigate to="/caixa" replace />
}

function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const { profile } = useAuth()

  if (profile?.role !== 'admin') {
    return <Navigate to="/caixa" replace />
  }

  return children
}

export function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/redefinir-pin" element={<PinRecoveryPage />} />
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<RoleLanding />} />
              <Route path="/dashboard" element={<RoleLanding />} />
              <Route path="/encomendas" element={<Navigate to="/" replace />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route
                path="/categorias"
                element={
                  <AdminOnlyRoute>
                    <CategoriesPage />
                  </AdminOnlyRoute>
                }
              />
              <Route path="/clientes" element={<CustomersPage />} />
              <Route
                path="/usuarios"
                element={
                  <AdminOnlyRoute>
                    <UsersPage />
                  </AdminOnlyRoute>
                }
              />
              <Route path="/estoque" element={<StockPage />} />
              <Route path="/vendas" element={<Navigate to="/caixa" replace />} />
              <Route path="/caixa" element={<CashPage />} />
              <Route path="/promissorias" element={<PromissoriesPage />} />
              <Route
                path="/configuracoes"
                element={
                  <AdminOnlyRoute>
                    <SettingsPage />
                  </AdminOnlyRoute>
                }
              />
              <Route path="/tutoriais" element={<TutorialsPage />} />
              <Route path="/tutoriais/:tutorialId" element={<TutorialsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
