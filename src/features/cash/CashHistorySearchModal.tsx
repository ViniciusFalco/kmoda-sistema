import { useState, type FormEvent } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  friendlyCatalogError,
  searchCashHistory,
  type CashHistoryFilters,
  type CashHistorySearchResult,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR, parseCurrencyToNumber } from '../../lib/utils'
import type { CashHistoryEntry, PaymentMethod } from '../../types/database'

interface CashHistorySearchModalProps {
  open: boolean
  onClose: () => void
  onSelectEntry: (entry: CashHistoryEntry) => void
}

const pageSize = 25

export function CashHistorySearchModal({ open, onClose, onSelectEntry }: CashHistorySearchModalProps) {
  const [type, setType] = useState<CashHistoryFilters['type']>('all')
  const [description, setDescription] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'all'>('all')
  const [result, setResult] = useState<CashHistorySearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function hasFilters() {
    return Boolean(
      type !== 'all' ||
        description.trim() ||
        minAmount.trim() ||
        maxAmount.trim() ||
        startDate ||
        endDate ||
        paymentMethod !== 'all',
    )
  }

  async function runSearch(page = 1) {
    if (!hasFilters()) {
      setResult(null)
      setError('Selecione pelo menos um filtro para buscar o histórico.')
      return
    }

    setLoading(true)
    setError('')

    const filters: CashHistoryFilters = {
      type,
      description,
      minAmount: minAmount ? parseCurrencyToNumber(minAmount) : null,
      maxAmount: maxAmount ? parseCurrencyToNumber(maxAmount) : null,
      startDate,
      endDate,
      paymentMethod,
      page,
      pageSize,
    }

    try {
      setResult(await searchCashHistory(filters))
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runSearch(1)
  }

  function clearFilters() {
    setType('all')
    setDescription('')
    setMinAmount('')
    setMaxAmount('')
    setStartDate('')
    setEndDate('')
    setPaymentMethod('all')
    setResult(null)
    setError('')
  }

  const currentPage = result?.page ?? 1
  const totalPages = result ? Math.max(1, Math.ceil(result.count / result.pageSize)) : 1

  return (
    <Modal open={open} title="Buscar histórico" onClose={onClose} size="6xl">
      <div className="space-y-5">
        <form className="grid gap-4 lg:grid-cols-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Tipo</span>
            <select
              className="h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              value={type}
              onChange={(event) => setType(event.target.value as CashHistoryFilters['type'])}
            >
              <option value="all">Todos</option>
              <option value="income">Venda/Entrada</option>
              <option value="expense">Gasto/Saída</option>
              <option value="session_open">Abertura de caixa</option>
              <option value="session_close">Fechamento de caixa</option>
            </select>
          </label>
          <Input label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Input label="Valor mínimo" inputMode="decimal" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} />
          <Input label="Valor máximo" inputMode="decimal" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} />
          <Input label="Data inicial" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input label="Data final" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Pagamento</span>
            <select
              className="h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | 'all')}
            >
              <option value="all">Todos</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="cartao_debito">Cartão de débito</option>
              <option value="cartao_credito">Cartão de crédito</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Buscando...' : 'Aplicar filtros'}
            </Button>
            <Button type="button" variant="secondary" onClick={clearFilters} disabled={loading}>
              Limpar filtros
            </Button>
          </div>
        </form>

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        {result ? (
          <div className="space-y-3">
            {result.data.length === 0 ? (
              <div className="rounded-lg border-2 border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border-2 border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm text-gray-700">
                    <thead className="bg-gray-50 text-[11px] uppercase tracking-[0.14em] text-gray-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">ID</th>
                        <th className="px-4 py-3 font-semibold">Tipo</th>
                        <th className="px-4 py-3 font-semibold">Descrição</th>
                        <th className="px-4 py-3 font-semibold">Valor</th>
                        <th className="px-4 py-3 font-semibold">Data</th>
                        <th className="px-4 py-3 font-semibold">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.data.map((entry) => {
                        const isSession = entry.kind === 'session'
                        const isIncome = !isSession && entry.type === 'income'

                        return (
                          <tr
                            key={entry.id}
                            className={`cursor-pointer transition ${
                              isSession
                                ? 'bg-gray-50 hover:bg-gray-100'
                                : isIncome
                                  ? 'bg-emerald-50 hover:bg-emerald-100'
                                  : 'bg-rose-50 hover:bg-rose-100'
                            }`}
                            onClick={() => onSelectEntry(entry)}
                          >
                            <td className={`px-4 py-3 text-xs font-medium text-gray-500`}>
                              {entry.movement_code ?? shortCode(entry.id)}
                            </td>
                            <td className="px-4 py-3">
                              {isSession ? (
                                <Badge variant="neutral">{entry.eventType === 'open' ? 'Abertura' : 'Fechamento'}</Badge>
                              ) : (
                                <Badge variant={entry.type === 'income' ? 'success' : 'warning'}>
                                  {movementLabel(entry)}
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {isSession
                                ? entry.eventType === 'open'
                                  ? 'Abertura de caixa'
                                  : 'Fechamento de caixa'
                                : movementDescription(entry)}
                            </td>
                            <td className={`px-4 py-3 ${isSession ? 'text-gray-700' : isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isSession ? '' : entry.type === 'income' ? '+' : '-'}
                              {formatCurrencyBRL(entry.amount)}
                            </td>
                            <td className="px-4 py-3 text-gray-600">{formatDateBR(entry.movement_date)}</td>
                            <td className="px-4 py-3 text-gray-600">{isSession ? '-' : paymentLabel(entry.payment_method, entry.sale?.installments_count)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500">
              <p>
                Página {currentPage} de {totalPages} · {result.count} resultado(s)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void runSearch(currentPage - 1)}
                  disabled={loading || currentPage <= 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void runSearch(currentPage + 1)}
                  disabled={loading || currentPage >= totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Aplique pelo menos um filtro para carregar o histórico.
          </div>
        )}
      </div>
    </Modal>
  )
}

function movementLabel(entry: Extract<CashHistoryEntry, { kind: 'movement' }>) {
  if (entry.type === 'expense') {
    return 'Gasto'
  }

  if (entry.origin === 'sale' && entry.sale?.installments_count && entry.sale.installments_count > 1) {
    return `Venda ${entry.sale.installments_count}x`
  }

  return entry.origin === 'sale' ? 'Venda' : 'Entrada avulsa'
}

function movementDescription(entry: Extract<CashHistoryEntry, { kind: 'movement' }>) {
  if (entry.origin !== 'sale') {
    return entry.description
  }

  const productNames = entry.sale?.sale_items
    ?.map((item) => item.product?.product_model?.name ?? item.product?.name)
    .filter(Boolean)

  const installments = entry.sale?.installments_count && entry.sale.installments_count > 1 ? ` · ${entry.sale.installments_count}x` : ''

  return `${productNames?.length ? productNames.join(', ') : entry.description}${installments}`
}

function shortCode(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`
}

function paymentLabel(method?: string | null, installmentsCount?: number | null) {
  const labels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'Pix',
    cartao_debito: 'Cartão de débito',
    cartao_credito: 'Cartão de crédito',
    outro: 'Outro',
  }

  if (!method) {
    return '-'
  }

  const base = labels[method] ?? method

  if (method === 'cartao_credito' && installmentsCount && installmentsCount > 1) {
    return `${base} (${installmentsCount}x)`
  }

  return base
}
