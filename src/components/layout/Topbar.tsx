import { LogOut, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'
import { QuickSearch } from '../ui/QuickSearch'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Central da loja',
  '/produtos': 'Produtos',
  '/categorias': 'Cadastros',
  '/clientes': 'Clientes',
  '/estoque': 'Estoque',
  '/vendas': 'Vendas',
  '/caixa': 'Caixa',
  '/encomendas': 'Encomendas',
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
          Menu
        </Button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">KModa</p>
          <h1 className="truncate text-lg font-semibold text-gray-950">{title}</h1>
        </div>
      </div>

      <div className="hidden flex-1 justify-center lg:flex">
        <QuickSearch placeholder="Buscar produto, cliente ou código" />
      </div>

      <div className="flex shrink-0 items-center gap-3">
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
