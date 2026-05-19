import { Menu } from 'lucide-react'
import { useDisplayName } from '../../hooks/useAppSettings'
import { getGreeting } from '../../lib/appSettings'
import { Button } from '../ui/Button'
import { QuickSearch } from '../ui/QuickSearch'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const displayName = useDisplayName()
  const greeting = getGreeting()

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
        <div className="flex min-w-0 items-center">
          <img
            src="/logo.png"
            alt="KModa"
            className="h-9 w-auto max-w-[140px] object-contain"
          />
        </div>
      </div>

      <div className="hidden flex-1 justify-center lg:flex">
        <QuickSearch placeholder="Buscar produto, cliente ou código" />
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-medium text-gray-800">
          {greeting}, {displayName}
        </p>
      </div>
    </header>
  )
}
