import { CheckCircle2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatCurrencyBRL } from '../../lib/utils'

interface CashSaleCompletionModalProps {
  open: boolean
  total: number
  customerName: string
  onClose: () => void
  durationMs?: number
}

const defaultDurationMs = 10_000

export function CashSaleCompletionModal({
  open,
  total,
  customerName,
  onClose,
  durationMs = defaultDurationMs,
}: CashSaleCompletionModalProps) {
  const [progress, setProgress] = useState(0)
  const closeRequestedRef = useRef(false)

  const remainingSeconds = useMemo(() => {
    return Math.max(0, Math.ceil(((1 - progress) * durationMs) / 1000))
  }, [durationMs, progress])

  useEffect(() => {
    if (!open) {
      closeRequestedRef.current = false
      return
    }

    closeRequestedRef.current = false
    setProgress(0)

    const startedAt = performance.now()
    const interval = window.setInterval(() => {
      const elapsed = performance.now() - startedAt
      const nextProgress = Math.min(elapsed / durationMs, 1)
      setProgress(nextProgress)

      if (nextProgress >= 1 && !closeRequestedRef.current) {
        closeRequestedRef.current = true
        onClose()
      }
    }, 40)

    return () => {
      window.clearInterval(interval)
    }
  }, [durationMs, onClose, open])

  const customerLabel = customerName.trim() || 'Cliente avulso'

  return (
    <Modal open={open} title="Venda concluída" onClose={onClose} size="lg" position="center">
      <div className="space-y-5">
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 text-center shadow-[0_8px_24px_rgba(6,95,70,0.08)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-700 bg-emerald-700 text-white shadow-[0_18px_40px_rgba(6,95,70,0.28)]">
            <CheckCircle2 className="h-11 w-11 animate-[saleSuccessPop_620ms_cubic-bezier(0.16,1,0.3,1)_both]" />
          </div>

          <h3 className="mt-4 text-xl font-semibold tracking-[-0.04em] text-gray-950">Venda concluída</h3>
          <p className="mt-2 text-sm text-gray-600">O lançamento foi registrado no caixa com sucesso.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border-2 border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Cliente</p>
            <p className="mt-1 text-base font-semibold text-gray-950">{customerLabel}</p>
          </div>

          <div className="rounded-md border-2 border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Total da venda</p>
            <p className="mt-1 text-base font-semibold text-gray-950">{formatCurrencyBRL(total)}</p>
          </div>
        </div>

        <div className="rounded-md border-2 border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Fechando automaticamente</p>
            <p className="text-xs font-semibold text-gray-700">{remainingSeconds}s</p>
          </div>

          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-emerald-700 transition-[width] duration-75 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <p className="mt-2 text-xs text-gray-600">Você pode concluir agora ou aguardar o fechamento automático.</p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="primary" type="button" onClick={onClose}>
            Concluir
          </Button>
        </div>
      </div>

      <style>
        {`
          @keyframes saleSuccessPop {
            0% {
              transform: scale(0.72);
              opacity: 0;
            }

            65% {
              transform: scale(1.08);
              opacity: 1;
            }

            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
    </Modal>
  )
}
