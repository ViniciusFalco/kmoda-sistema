import { LogOut, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/produtos': 'Produtos',
  '/categorias': 'Categorias',
  '/clientes': 'Clientes',
  '/estoque': 'Estoque',
  '/vendas': 'Vendas',
  '/caixa': 'Fluxo de Caixa',
  '/configuracoes': 'Configurações',
}

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const title = pageTitles[location.pathname] ?? 'KModa'

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-gray-950">{title}</h1>
          <p className="hidden text-sm text-gray-500 sm:block">Painel administrativo da loja</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-gray-800">Administrador</p>
          <p className="max-w-48 truncate text-xs text-gray-500">{user?.email ?? 'Sessão ativa'}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  )
}
