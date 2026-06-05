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
  lastClosedSession?: CashSession | null
}

export function OpenCashSessionForm({ onCancel, onSaved, lastClosedSession }: OpenCashSessionFormProps) {
  const { user } = useAuth()
  const [openingAmount, setOpeningAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const lastClosedAmount = lastClosedSession?.closing_amount ?? null

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
    <form className="space-y-5 text-gray-950" onSubmit={handleSubmit}>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {lastClosedSession && lastClosedAmount !== null ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">
                Valor do último fechamento
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-950">
                {formatCurrencyBRL(lastClosedAmount)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatDateBR(lastClosedSession.closed_at ?? lastClosedSession.session_date)}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpeningAmount(formatCurrencyInput(formatCurrencyBRL(lastClosedAmount)))}
            >
              Usar este valor
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <Input
          label="Valor inicial em caixa"
          labelClassName="block text-center text-xs font-semibold uppercase tracking-[0.24em] text-gray-500"
          value={openingAmount}
          inputMode="numeric"
          placeholder="R$ 0,00"
          className="mt-3 h-14 text-center text-2xl font-semibold tracking-[0.04em]"
          onChange={(event) => setOpeningAmount(formatCurrencyInput(event.target.value))}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Observação</span>
        <textarea
          maxLength={80}
          rows={2}
          className="min-h-20 w-full resize-none rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <p className="text-[11px] text-gray-500">Máximo de 80 caracteres.</p>
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
  const movementBalance = useMemo(() => income - expense, [income, expense])
  const expectedAmount = useMemo(() => session.opening_amount + movementBalance, [session.opening_amount, movementBalance])
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const parsedClosing = parseCurrencyToNumber(closingAmount)
  const closingDifference = parsedClosing - expectedAmount

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const closed = await closeCashSession({
        sessionId: session.id,
        closingAmount: parsedClosing,
        expectedAmount,
        differenceAmount: closingDifference,
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
    <form className="space-y-5 text-gray-950" onSubmit={handleSubmit}>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="overflow-hidden rounded-2xl border-2 border-gray-200 bg-white">
        <div className="border-b-2 border-gray-100 pb-4 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-gray-500">
            {formatCloseSummaryDate(session.session_date)}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-700">
            {formatCloseSummaryWeekday(session.session_date)}
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          <SummaryRow label="Valor inicial" value={formatCurrencyBRL(session.opening_amount)} />
          <SummaryRow label="Entradas" value={formatCurrencyBRL(income)} tone="positive" />
          <SummaryRow label="Saídas" value={formatCurrencyBRL(expense)} tone="negative" />
          <SummaryRow label="Diferença" value={formatCurrencyBRL(movementBalance)} tone={movementBalance > 0 ? 'positive' : movementBalance < 0 ? 'negative' : 'neutral'} />
          <SummaryRow label="Dinheiro no caixa" value={formatCurrencyBRL(expectedAmount)} helper="saldo esperado" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <Input
          label="Valor contado no caixa"
          labelClassName="block text-center text-xs font-semibold uppercase tracking-[0.24em] text-gray-500"
          value={closingAmount}
          inputMode="numeric"
          placeholder="R$ 0,00"
          className="mt-3 h-14 text-center text-2xl font-semibold tracking-[0.04em]"
          onChange={(event) => setClosingAmount(formatCurrencyInput(event.target.value))}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Observação</span>
        <textarea
          maxLength={80}
          rows={2}
          className="min-h-20 w-full resize-none rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <p className="text-[11px] text-gray-500">Máximo de 80 caracteres.</p>
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

function SummaryRow({
  label,
  value,
  tone = 'neutral',
  helper,
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative' | 'neutral'
  helper?: string
}) {
  const toneClass = tone === 'positive' ? 'text-emerald-700' : tone === 'negative' ? 'text-rose-700' : 'text-gray-950'
  const backgroundClass =
    tone === 'positive'
      ? 'bg-emerald-50'
      : tone === 'negative'
        ? 'bg-rose-50'
        : 'bg-gray-50'

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 ${backgroundClass}`}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">{label}</p>
        {helper ? <p className="mt-1 text-[11px] text-gray-500">{helper}</p> : null}
      </div>
      <div className="min-w-[8rem] text-right">
        <p className={`text-sm font-semibold ${toneClass}`}>{value}</p>
      </div>
    </div>
  )
}

function formatCloseSummaryDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCloseSummaryWeekday(value: string) {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(new Date(value))
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}
