import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { closeCashSession, friendlyCatalogError, openCashSession } from '../../lib/catalog'
import { formatCurrencyBRL, formatCurrencyInput, formatDateBR, parseCurrencyToNumber } from '../../lib/utils'
import type { CashSession } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'

interface OpenCashSessionFormProps {
  onCancel: () => void
  onSaved: (session: CashSession) => void
}

export function OpenCashSessionForm({ onCancel, onSaved }: OpenCashSessionFormProps) {
  const { user } = useAuth()
  const [openingAmount, setOpeningAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const session = await openCashSession({
        openingAmount: parseCurrencyToNumber(openingAmount),
        notes,
        user,
      })
      onSaved(session)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <Input
        label="Valor inicial em caixa"
        value={openingAmount}
        inputMode="numeric"
        placeholder="R$ 0,00"
        onChange={(event) => setOpeningAmount(formatCurrencyInput(event.target.value))}
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Observação</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Abrindo...' : 'Confirmar abertura'}
        </Button>
      </div>
    </form>
  )
}

interface CloseCashSessionFormProps {
  session: CashSession
  income: number
  expense: number
  onCancel: () => void
  onSaved: (session: CashSession) => void
}

export function CloseCashSessionForm({ session, income, expense, onCancel, onSaved }: CloseCashSessionFormProps) {
  const { user } = useAuth()
  const expectedAmount = useMemo(() => session.opening_amount + income - expense, [session.opening_amount, income, expense])
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const parsedClosing = parseCurrencyToNumber(closingAmount)
  const difference = parsedClosing - expectedAmount

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const closed = await closeCashSession({
        sessionId: session.id,
        closingAmount: parsedClosing,
        expectedAmount,
        differenceAmount: difference,
        notes,
        user,
      })
      onSaved(closed)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Summary label="Data" value={formatDateBR(session.session_date)} />
        <Summary label="Valor inicial" value={formatCurrencyBRL(session.opening_amount)} />
        <Summary label="Entradas" value={formatCurrencyBRL(income)} />
        <Summary label="Gastos" value={formatCurrencyBRL(expense)} />
        <Summary label="Saldo esperado" value={formatCurrencyBRL(expectedAmount)} />
        <Summary label="Diferença" value={formatCurrencyBRL(difference)} tone={difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral'} />
      </div>
      <Input
        label="Valor contado no caixa"
        value={closingAmount}
        inputMode="numeric"
        placeholder="R$ 0,00"
        onChange={(event) => setClosingAmount(formatCurrencyInput(event.target.value))}
      />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Observação</span>
        <textarea
          className="min-h-24 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Fechando...' : 'Confirmar fechamento'}
        </Button>
      </div>
    </form>
  )
}

function Summary({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'positive' | 'negative' | 'neutral' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-red-700' : 'text-gray-950'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium uppercase text-gray-400">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
