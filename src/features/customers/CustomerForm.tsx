import type { FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

interface CustomerFormProps {
  onCancel: () => void
  onSubmit: () => void
}

export function CustomerForm({ onCancel, onSubmit }: CustomerFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome" name="name" required />
        <Input label="Telefone" name="phone" />
        <Input label="E-mail" name="email" type="email" />
        <Input label="CPF opcional" name="cpf" />
      </div>
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
        <Button type="submit">Salvar cliente</Button>
      </div>
    </form>
  )
}
