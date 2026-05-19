import type { FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { CashMovementType } from '../../types/database'

interface CashMovementFormProps {
  onSubmit: () => void
  onCancel?: () => void
  defaultType?: CashMovementType
}

export function CashMovementForm({ onSubmit, onCancel, defaultType = 'entrada' }: CashMovementFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Tipo</span>
        <select
          name="type"
          defaultValue={defaultType}
          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>
      <Input label="Descrição" name="description" required />
      <Input label="Valor" name="amount" type="number" min="0" step="0.01" required />
      <Input label="Data" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Pagamento</span>
        <select name="payment" className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="cartao_credito">Cartão de crédito</option>
          <option value="cartao_debito">Cartão de débito</option>
        </select>
      </label>
      <Input label="Observação" name="notes" />
      </div>
      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button type="submit">
          Registrar
        </Button>
      </div>
    </form>
  )
}
