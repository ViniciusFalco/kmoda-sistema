import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { createCashExpense, friendlyCatalogError } from '../../lib/catalog'
import { formatCurrencyBRL, formatCurrencyInput, getTodayLocalDate, parseCurrencyToNumber } from '../../lib/utils'
import type { PaymentMethod } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { CashSessionBlockedOverlay } from './CashSessionBlockedOverlay'

interface CashExpenseFormProps {
  onCancel: () => void
  onSaved: () => void
  onOpenCash: () => void
  cashSessionId?: string | null
  sessionClosed?: boolean
}

export function CashExpenseForm({ onCancel, onSaved, onOpenCash, cashSessionId, sessionClosed }: CashExpenseFormProps) {
  const { user } = useAuth()
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [movementDate, setMovementDate] = useState(getTodayLocalDate())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const cashSessionOpen = Boolean(cashSessionId) && !sessionClosed
  const isBlocked = !cashSessionOpen
  const blockedMessage = 'Abra o caixa para registrar vendas ou gastos.'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cashSessionOpen) {
      setError(blockedMessage)
      return
    }

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
        cashSessionId,
      })
      onSaved()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="relative space-y-5 text-white" onSubmit={handleSubmit}>
      <div className={`space-y-5 ${isBlocked ? 'pointer-events-none blur-[1.5px] select-none' : ''}`}>
        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/5 p-4 md:grid-cols-2">
          <Input tone="dark" label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} required />
          <Input
            tone="dark"
            label="Valor"
            type="text"
            inputMode="numeric"
            placeholder="R$ 0,00"
            value={amount}
            onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
            required
          />
          <Input tone="dark" label="Data" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/75">Pagamento</span>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
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
          <span className="text-sm font-medium text-white/75">Observação</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20 focus:ring-2 focus:ring-white/10"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error ? <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}

        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_180px] md:items-end">
          <div>
            <p className="text-sm text-white/55">Total do gasto</p>
            <p className="text-3xl font-semibold text-white">{formatCurrencyBRL(parseCurrencyToNumber(amount))}</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button tone="dark" variant="secondary" type="button" onClick={onCancel}>
              Cancelar
            </Button>
            <Button tone="dark" type="submit" disabled={submitting || !cashSessionOpen}>
              {submitting ? 'Registrando...' : 'Registrar gasto'}
            </Button>
          </div>
        </div>
      </div>

      {isBlocked ? <CashSessionBlockedOverlay onOpenCash={onOpenCash} /> : null}
    </form>
  )
}
