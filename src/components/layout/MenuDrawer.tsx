import {
  Boxes,
  CreditCard,
  Home,
  Package,
  Palette,
  Ruler,
  Settings,
  ShoppingBag,
  Tags,
  Truck,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

const mainItems = [
  { label: 'Início', path: '/dashboard', icon: Home },
  { label: 'Vendas', path: '/vendas', icon: ShoppingBag },
  { label: 'Estoque', path: '/estoque', icon: Boxes },
  { label: 'Caixa', path: '/caixa', icon: CreditCard },
  { label: 'Encomendas', path: '/encomendas', icon: Truck },
]

const registryItems = [
  { label: 'Produtos', path: '/produtos', icon: Package },
  { label: 'Marcas', path: '/categorias', icon: Tags },
  { label: 'Tipos de roupa', path: '/categorias', icon: Tags },
  { label: 'Tamanhos', path: '/categorias', icon: Ruler },
  { label: 'Cores', path: '/categorias', icon: Palette },
  { label: 'Clientes', path: '/clientes', icon: Users },
]

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
}

export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  return (
    <>
      <div
        className={cn('fixed inset-0 z-40 bg-gray-950/30 transition', open ? 'block' : 'hidden')}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[92vw] max-w-[380px] -translate-x-full flex-col border-r border-gray-200 bg-white shadow-xl transition',
          open && 'translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <div>
            <p className="text-base font-semibold text-gray-950">KModa</p>
            <p className="text-xs text-gray-500">Menu da loja</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <MenuGroup title="Operação" items={mainItems} onClose={onClose} />
          <MenuGroup title="Cadastros" items={registryItems} onClose={onClose} />
          <div className="mt-6 border-t border-gray-100 pt-4">
            <DrawerLink label="Configurações" path="/configuracoes" icon={Settings} onClose={onClose} />
          </div>
        </nav>
      </aside>
    </>
  )
}

function MenuGroup({
  title,
  items,
  onClose,
}: {
  title: string
  items: Array<{ label: string; path: string; icon: LucideIcon }>
  onClose: () => void
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-2 text-xs font-semibold uppercase text-gray-400">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <DrawerLink key={`${item.label}-${item.path}`} {...item} onClose={onClose} />
        ))}
      </div>
    </div>
  )
}

function DrawerLink({
  label,
  path,
  icon: Icon,
  onClose,
}: {
  label: string
  path: string
  icon: LucideIcon
  onClose: () => void
}) {
  return (
    <NavLink
      to={path}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition',
          isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950',
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )
}
