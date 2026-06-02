import { Lock } from 'lucide-react'
import { Button } from '../../components/ui/Button'

interface CashSessionBlockedOverlayProps {
  onOpenCash: () => void
}

export function CashSessionBlockedOverlay({ onOpenCash }: CashSessionBlockedOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-white/70 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-6 text-center text-gray-950 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-900">
          <Lock className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-gray-950">
          Caixa fechado
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Abra o caixa para registrar vendas ou gastos.
        </p>

        <div className="mt-5">
          <Button onClick={onOpenCash} className="h-11 w-full">
            Abrir caixa
          </Button>
        </div>
      </div>
    </div>
  )
}
