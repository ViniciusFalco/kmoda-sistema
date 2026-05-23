import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { formatCurrencyBRL } from '../../lib/utils'

interface CashInstallmentModalProps {
  open: boolean
  total: number
  installmentsCount: number
  onSelectInstallmentsCount: (installmentsCount: number) => void
  onCancel: () => void
  onConfirm: (installmentsCount: number) => void
}

export function CashInstallmentModal({
  open,
  total,
  installmentsCount,
  onSelectInstallmentsCount,
  onCancel,
  onConfirm,
}: CashInstallmentModalProps) {
  const count = Math.max(1, installmentsCount)
  const installmentValue = total / count

  return (
    <Modal
      open={open}
      title="Parcelamento"
      onClose={onCancel}
      size="lg"
      tone="dark"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
            Total da venda
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            {formatCurrencyBRL(total)}
          </p>
          <p className="mt-2 text-sm text-white/55">
            Selecione a quantidade de parcelas para a venda no crédito.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }, (_, index) => index + 1).map((count) => (
            <button
              key={count}
              type="button"
              className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                installmentsCount === count
                  ? 'border-white bg-white text-zinc-950 shadow-sm'
                  : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => onSelectInstallmentsCount(count)}
            >
              {count}x
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] px-4 py-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
            Valor por parcela
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
            {formatCurrencyBRL(installmentValue)}
          </p>
          <p className="mt-1 text-sm text-white/55">
            {installmentsCount} parcelas
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" tone="dark" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" tone="dark" onClick={() => onConfirm(installmentsCount)}>
            Confirmar parcelas
          </Button>
        </div>
      </div>
    </Modal>
  )
}
