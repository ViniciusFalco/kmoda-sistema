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
    <form className="space-y-5 text-white" onSubmit={handleSubmit}>
      {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
      {lastClosedSession && lastClosedAmount !== null ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
                Valor do último fechamento
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                {formatCurrencyBRL(lastClosedAmount)}
              </p>
              <p className="mt-1 text-xs text-white/45">
                {formatDateBR(lastClosedSession.closed_at ?? lastClosedSession.session_date)}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              tone="dark"
              onClick={() => setOpeningAmount(formatCurrencyInput(formatCurrencyBRL(lastClosedAmount)))}
            >
              Usar este valor
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        <Input
          label="Valor inicial em caixa"
          labelClassName="block text-center text-xs font-semibold uppercase tracking-[0.24em] text-white/55"
          value={openingAmount}
          inputMode="numeric"
          placeholder="R$ 0,00"
          tone="dark"
          className="mt-3 h-14 text-center text-2xl font-semibold tracking-[0.04em]"
          onChange={(event) => setOpeningAmount(formatCurrencyInput(event.target.value))}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-white/75">Observação</span>
        <textarea
          maxLength={80}
          rows={2}
          className="min-h-20 w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20 focus:ring-2 focus:ring-white/10"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <p className="text-[11px] text-white/35">Máximo de 80 caracteres.</p>
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" tone="dark" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" tone="dark" disabled={submitting}>
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
    <form className="space-y-5 text-white" onSubmit={handleSubmit}>
      {error ? <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 pb-4 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-white/45">
            {formatCloseSummaryDate(session.session_date)}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            {formatCloseSummaryWeekday(session.session_date)}
          </p>
        </div>

        <div className="divide-y divide-white/10">
          <SummaryRow label="Valor inicial" value={formatCurrencyBRL(session.opening_amount)} />
          <SummaryRow label="Entradas" value={formatCurrencyBRL(income)} tone="positive" />
          <SummaryRow label="Saídas" value={formatCurrencyBRL(expense)} tone="negative" />
          <SummaryRow label="Diferença" value={formatCurrencyBRL(movementBalance)} tone={movementBalance > 0 ? 'positive' : movementBalance < 0 ? 'negative' : 'neutral'} />
          <SummaryRow label="Dinheiro no caixa" value={formatCurrencyBRL(expectedAmount)} helper="saldo esperado" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0b0b] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
        <Input
          label="Valor contado no caixa"
          labelClassName="block text-center text-xs font-semibold uppercase tracking-[0.24em] text-white/55"
          value={closingAmount}
          inputMode="numeric"
          placeholder="R$ 0,00"
          tone="dark"
          className="mt-3 h-14 text-center text-2xl font-semibold tracking-[0.04em]"
          onChange={(event) => setClosingAmount(formatCurrencyInput(event.target.value))}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-white/75">Observação</span>
        <textarea
          maxLength={80}
          rows={2}
          className="min-h-20 w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20 focus:ring-2 focus:ring-white/10"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
        <p className="text-[11px] text-white/35">Máximo de 80 caracteres.</p>
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" tone="dark" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" tone="dark" disabled={submitting}>
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
  const toneClass = tone === 'positive' ? 'text-emerald-300' : tone === 'negative' ? 'text-rose-300' : 'text-white'
  const backgroundClass =
    tone === 'positive'
      ? 'bg-emerald-500/14'
      : tone === 'negative'
        ? 'bg-rose-500/14'
        : 'bg-white/6'

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 ${backgroundClass}`}>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-white">{label}</p>
        {helper ? <p className="mt-1 text-[11px] text-white/55">{helper}</p> : null}
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
