import { Lock } from 'lucide-react'
import { Button } from '../../components/ui/Button'

interface CashSessionBlockedOverlayProps {
  onOpenCash: () => void
}

export function CashSessionBlockedOverlay({ onOpenCash }: CashSessionBlockedOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl bg-black/65 px-6 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#070707] p-6 text-center text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
          <Lock className="h-7 w-7" />
        </div>

        <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">
          Caixa fechado
        </h3>

        <p className="mt-2 text-sm leading-6 text-white/65">
          Abra o caixa para registrar vendas ou gastos.
        </p>

        <div className="mt-5">
          <Button tone="dark" onClick={onOpenCash} className="h-11 w-full">
            Abrir caixa
          </Button>
        </div>
      </div>
    </div>
  )
}
