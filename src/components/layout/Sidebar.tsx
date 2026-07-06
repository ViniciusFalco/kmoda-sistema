import {
  BarChart3,
  Boxes,
  CreditCard,
  BookOpenText,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Tags,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'

const adminMenuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Produtos', path: '/produtos', icon: Package },
  { label: 'Cadastros', path: '/categorias', icon: Tags },
  { label: 'Clientes', path: '/clientes', icon: Users },
  { label: 'Caixa', path: '/caixa', icon: CreditCard },
  { label: 'Promissórias', path: '/promissorias', icon: ReceiptText },
  { label: 'Estoque', path: '/estoque', icon: Boxes },
  { label: 'Configurações', path: '/configuracoes', icon: Settings },
  { label: 'Tutoriais', path: '/tutoriais', icon: BookOpenText },
]

const cashierMenuItems = [
  { label: 'Caixa', path: '/caixa', icon: CreditCard },
  { label: 'Promissórias', path: '/promissorias', icon: ReceiptText },
  { label: 'Produtos', path: '/produtos', icon: Package },
  { label: 'Clientes', path: '/clientes', icon: Users },
  { label: 'Tutoriais', path: '/tutoriais', icon: BookOpenText },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin } = useAuth()
  const menuItems = isAdmin ? adminMenuItems : cashierMenuItems

  return (
    <>
      <div
        className={cn('fixed inset-0 z-30 bg-gray-950/30 lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 -translate-x-full flex-col border-r border-gray-200 bg-white transition lg:static lg:translate-x-0',
          open && 'translate-x-0',
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-900 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-950">KModa</p>
            <p className="text-xs text-gray-500">{isAdmin ? 'Administração' : 'Operadora de caixa'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
