import { LogOut, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

const menuItems = [
  { label: 'Caixa', path: '/' },
  { label: 'Produtos', path: '/produtos' },
  { label: 'Clientes', path: '/clientes' },
  { label: 'Tutoriais', path: '/tutoriais' },
]

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
}

export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  const { signOut, profile, isAdmin } = useAuth()
  const visibleMenuItems = isAdmin
    ? [
        { label: 'Início', path: '/' },
        { label: 'Caixa', path: '/caixa' },
        { label: 'Estoque', path: '/estoque' },
        { label: 'Produtos', path: '/produtos' },
        { label: 'Clientes', path: '/clientes' },
        { label: 'Cadastros', path: '/categorias' },
        { label: 'Configurações', path: '/configuracoes' },
        { label: 'Tutoriais', path: '/tutoriais' },
      ]
    : menuItems

  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-gray-950/30 transition lg:hidden', open ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] -translate-x-full flex-col border-r border-gray-200 bg-white shadow-xl transition lg:hidden',
          open && 'translate-x-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-950">KModa</p>
            <p className="text-xs text-gray-500">Navegação</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar menu" className="h-8 w-8 px-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-md border px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'border-gray-300 bg-gray-100 text-gray-950'
                    : 'border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-950',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">{profile?.name ?? 'Sessão ativa'}</p>
            <p className="mt-1 text-xs text-gray-500">{isAdmin ? 'Perfil administradora' : 'Modo operador de caixa'}</p>
            <Button
              variant="secondary"
              className="mt-3 w-full justify-center"
              onClick={async () => {
                await signOut()
                onClose()
              }}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
