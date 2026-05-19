import type { FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface OrderFormProps {
  onCancel: () => void
  onSubmit: () => void
}

export function OrderForm({ onCancel, onSubmit }: OrderFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Cliente" name="customer" required />
        <Input label="Produto ou descrição" name="product" required />
        <Input label="Valor" name="amount" type="number" min="0" step="0.01" />
        <Input label="Data prevista" name="expected_date" type="date" />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Status</span>
        <select name="status" className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="pendente">Pendente</option>
          <option value="em_separacao">Em separação</option>
          <option value="pronta">Pronta</option>
          <option value="entregue">Entregue</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Observações</span>
        <textarea
          name="notes"
          rows={3}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Salvar encomenda</Button>
      </div>
    </form>
  )
}
