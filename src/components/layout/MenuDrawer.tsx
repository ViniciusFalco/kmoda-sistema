import {
  Boxes,
  CreditCard,
  ChevronDown,
  LogOut,
  Home,
  Package,
  Palette,
  Ruler,
  Settings,
  Tags,
  Users,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDisplayName } from '../../hooks/useAppSettings'
import { getGreeting } from '../../lib/appSettings'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'

const mainItems = [
  { label: 'Início', path: '/dashboard', icon: Home },
  { label: 'Caixa', path: '/caixa', icon: CreditCard },
  { label: 'Estoque', path: '/estoque', icon: Boxes },
]

const categoryItems = [
  { label: 'Marcas', path: '/categorias', icon: Tags },
  { label: 'Tipos de roupa', path: '/categorias', icon: Tags },
  { label: 'Tamanhos', path: '/categorias', icon: Ruler },
  { label: 'Cores', path: '/categorias', icon: Palette },
]

interface MenuDrawerProps {
  open: boolean
  onClose: () => void
}

export function MenuDrawer({ open, onClose }: MenuDrawerProps) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const displayName = useDisplayName()
  const greeting = getGreeting()
  const [categoriesOpen, setCategoriesOpen] = useState(location.pathname === '/categorias')

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
        <div className="relative flex h-40 items-center justify-center border-b border-gray-100 px-5">
          <img src="/logo.png" alt="KModa" className="h-32 w-auto max-w-[320px] object-contain" />
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar menu" className="absolute right-5 top-1/2 -translate-y-1/2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5">
          <MenuGroup title="Operação" items={mainItems} onClose={onClose} />
          <div className="mb-6">
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-gray-400">Cadastros</p>
            <div className="space-y-1">
              <DrawerLink label="Produtos" path="/produtos" icon={Package} onClose={onClose} />
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition',
                  location.pathname === '/categorias' ? 'bg-gray-100 text-gray-950' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950',
                )}
                onClick={() => setCategoriesOpen((current) => !current)}
              >
                <Tags className="h-4 w-4" />
                <span className="flex-1 text-left">Categorização de produtos</span>
                <ChevronDown className={cn('h-4 w-4 transition', categoriesOpen && 'rotate-180')} />
              </button>
              {categoriesOpen ? (
                <div className="ml-6 border-l border-gray-100 pl-2">
                  {categoryItems.map((item) => (
                    <SubDrawerLink key={item.label} {...item} active={location.pathname === item.path} onClose={onClose} />
                  ))}
                </div>
              ) : null}
              <DrawerLink label="Clientes" path="/clientes" icon={Users} onClose={onClose} />
            </div>
          </div>
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="mb-2 px-2 text-xs font-semibold uppercase text-gray-400">Outros</p>
            <DrawerLink label="Configurações" path="/configuracoes" icon={Settings} onClose={onClose} />
          </div>
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">
              {greeting}, {displayName}
            </p>
            <p className="mt-1 truncate text-xs text-gray-500">{user?.email ?? 'Sessão ativa'}</p>
            <Button
              variant="secondary"
              className="mt-4 w-full justify-center"
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

function SubDrawerLink({
  label,
  path,
  icon: Icon,
  active,
  onClose,
}: {
  label: string
  path: string
  icon: LucideIcon
  active: boolean
  onClose: () => void
}) {
  return (
    <NavLink
      to={path}
      onClick={onClose}
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition',
        active ? 'font-medium text-gray-950' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </NavLink>
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
