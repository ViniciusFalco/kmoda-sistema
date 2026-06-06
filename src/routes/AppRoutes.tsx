import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { LoginPage } from '../features/auth/LoginPage'
import { CashPage } from '../features/cash/CashPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { CustomersPage } from '../features/customers/CustomersPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ProductsPage } from '../features/products/ProductsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { StockPage } from '../features/stock/StockPage'
import { AuthProvider } from '../hooks/useAuth'
import { PrivateRoute } from './PrivateRoute'
import { NotFoundPage } from './NotFoundPage'

export function AppRoutes() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/encomendas" element={<Navigate to="/" replace />} />
              <Route path="/produtos" element={<ProductsPage />} />
              <Route path="/categorias" element={<CategoriesPage />} />
              <Route path="/clientes" element={<CustomersPage />} />
              <Route path="/estoque" element={<StockPage />} />
              <Route path="/vendas" element={<Navigate to="/caixa" replace />} />
              <Route path="/caixa" element={<CashPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
