import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { createCashExpense, friendlyCatalogError } from '../../lib/catalog'
import { formatCurrencyInput, getTodayLocalDate, parseCurrencyToNumber } from '../../lib/utils'
import type { PaymentMethod } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'

interface CashExpenseFormProps {
  onCancel: () => void
  onSaved: () => void
}

export function CashExpenseForm({ onCancel, onSaved }: CashExpenseFormProps) {
  const { user } = useAuth()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [movementDate, setMovementDate] = useState(getTodayLocalDate())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedAmount = parseCurrencyToNumber(amount)

    if (!description.trim()) {
      setError('Informe a descrição do gasto.')
      return
    }

    if (parsedAmount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createCashExpense({
        description,
        amount: parsedAmount,
        movementDate,
        paymentMethod,
        notes,
        user,
      })
      onSaved()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} required />
        <Input
          label="Valor"
          type="text"
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={amount}
          onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
          required
        />
        <Input label="Data" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} required />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Pagamento</span>
          <select
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          >
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">Pix</option>
            <option value="cartao_debito">Cartão de débito</option>
            <option value="cartao_credito">Cartão de crédito</option>
            <option value="outro">Outro</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Observação</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Registrando...' : 'Registrar gasto'}
        </Button>
      </div>
    </form>
  )
}
