import type { FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface CashMovementFormProps {
  onSubmit: () => void
}

export function CashMovementForm({ onSubmit }: CashMovementFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="grid gap-4 xl:grid-cols-6" onSubmit={handleSubmit}>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Tipo</span>
        <select name="type" className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>
      <Input label="Descrição" name="description" required />
      <Input label="Valor" name="amount" type="number" min="0" step="0.01" required />
      <Input label="Data" name="date" type="date" defaultValue="2026-05-18" required />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Pagamento</span>
        <select name="payment" className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="cartao_credito">Cartão de crédito</option>
          <option value="cartao_debito">Cartão de débito</option>
        </select>
      </label>
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Registrar
        </Button>
      </div>
    </form>
  )
}
