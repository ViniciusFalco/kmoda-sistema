import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { formatCurrencyBRL, formatCurrencyInput, parseCurrencyToNumber } from '../../lib/utils'
import type { DraftSaleLine } from './saleFlow'

interface CashItemInstallmentModalProps {
  open: boolean
  line: DraftSaleLine | null
  onClose: () => void
  onConfirm: (values: {
    unitPrice: number
    originalUnitPrice: number
    installmentsCount: number
    installmentValue: number
  }) => void
}

export function CashItemInstallmentModal({ open, line, onClose, onConfirm }: CashItemInstallmentModalProps) {
  const baseUnitPrice = line?.originalUnitPrice ?? line?.unitPrice ?? 0
  const [finalAmount, setFinalAmount] = useState(() =>
    line ? formatCurrencyInput(String(Math.round(line.quantity * line.unitPrice * 100))) : '',
  )
  const [installmentsCount, setInstallmentsCount] = useState(() => (line ? Math.max(2, line.installmentsCount ?? 2) : 2))

  const total = useMemo(() => parseCurrencyToNumber(finalAmount), [finalAmount])
  const installmentValue = total / Math.max(2, installmentsCount)
  const originalTotal = line ? line.quantity * baseUnitPrice : 0

  function handleConfirm() {
    if (!line) {
      return
    }

    if (total <= 0) {
      return
    }

    onConfirm({
      unitPrice: Math.round((total / Math.max(1, line.quantity)) * 100) / 100,
      originalUnitPrice: baseUnitPrice,
      installmentsCount: Math.max(2, installmentsCount),
      installmentValue: Math.round(installmentValue * 100) / 100,
    })
  }

  return (
    <Modal open={open && line !== null} title="Parcelamento" onClose={onClose} size="lg">
      {line ? (
        <div className="space-y-5">
          <div className="rounded-md border-2 border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 text-center">Produto</p>
            <p className="mt-1 text-sm font-semibold text-gray-950">{line.product.product_model?.name ?? line.product.name}</p>
            <p className="mt-1 text-xs text-gray-500">
              {[
                line.product.product_model?.brand?.name ?? line.product.brand?.name,
                line.product.product_model?.category?.name ?? line.product.clothing_type?.name,
                line.product.size?.name,
                line.product.color?.name,
              ]
                .filter(Boolean)
                .join(' • ') || 'Sem detalhes'}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Valor original do item" value={formatCurrencyBRL(originalTotal)} disabled />
            <Input
              label="Valor final parcelado"
              inputMode="decimal"
              value={finalAmount}
              onChange={(event) => setFinalAmount(formatCurrencyInput(event.target.value))}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Número de parcelas</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {Array.from({ length: 11 }, (_, index) => index + 2).map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`rounded-md border-2 px-3 py-3 text-sm font-semibold transition ${
                    installmentsCount === count
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setInstallmentsCount(count)}
                >
                  {count}x
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border-2 border-gray-200 bg-white p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Valor de cada parcela</p>
            <p className="mt-2 text-2xl font-semibold text-gray-950">{formatCurrencyBRL(installmentValue)}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Confirmar parcelamento
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
