import { useState, type FormEvent } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  friendlyCatalogError,
  searchCashMovements,
  type CashMovementFilters,
  type CashMovementSearchResult,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR, parseCurrencyToNumber } from '../../lib/utils'
import type { CashMovement, CashMovementType, PaymentMethod } from '../../types/database'

interface CashHistorySearchModalProps {
  open: boolean
  onClose: () => void
  onSelectMovement: (movement: CashMovement) => void
}

const pageSize = 25

export function CashHistorySearchModal({ open, onClose, onSelectMovement }: CashHistorySearchModalProps) {
  const [type, setType] = useState<CashMovementType | 'all'>('all')
  const [description, setDescription] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | 'all'>('all')
  const [result, setResult] = useState<CashMovementSearchResult | null>(null)
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

    const filters: CashMovementFilters = {
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
      setResult(await searchCashMovements(filters))
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
            <select className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm" value={type} onChange={(event) => setType(event.target.value as CashMovementType | 'all')}>
              <option value="all">Todos</option>
              <option value="income">Venda/Entrada</option>
              <option value="expense">Gasto/Saída</option>
            </select>
          </label>
          <Input label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} />
          <Input label="Valor mínimo" inputMode="decimal" value={minAmount} onChange={(event) => setMinAmount(event.target.value)} />
          <Input label="Valor máximo" inputMode="decimal" value={maxAmount} onChange={(event) => setMaxAmount(event.target.value)} />
          <Input label="Data inicial" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <Input label="Data final" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">Pagamento</span>
            <select className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | 'all')}>
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
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
                      {result.data.map((movement) => (
                        <tr
                          key={movement.id}
                          className={`cursor-pointer text-gray-700 transition ${movement.type === 'income' ? 'bg-emerald-50/40 hover:bg-emerald-50' : 'bg-rose-50/40 hover:bg-rose-50'}`}
                          onClick={() => onSelectMovement(movement)}
                        >
                          <td className="px-4 py-3 text-xs font-medium text-gray-500">{movement.movement_code ?? shortCode(movement.id)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={movement.type === 'income' ? 'success' : 'warning'}>
                              {movementLabel(movement)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-950">{movementDescription(movement)}</td>
                          <td className={movement.type === 'income' ? 'px-4 py-3 text-emerald-700' : 'px-4 py-3 text-red-700'}>
                            {movement.type === 'income' ? '+' : '-'}
                            {formatCurrencyBRL(movement.amount)}
                          </td>
                          <td className="px-4 py-3">{formatDateBR(movement.movement_date)}</td>
                          <td className="px-4 py-3">{paymentLabel(movement.payment_method)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-600">
              <p>
                Página {currentPage} de {totalPages} · {result.count} resultado(s)
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => void runSearch(currentPage - 1)} disabled={loading || currentPage <= 1}>
                  Anterior
                </Button>
                <Button variant="secondary" size="sm" onClick={() => void runSearch(currentPage + 1)} disabled={loading || currentPage >= totalPages}>
                  Próxima
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
            Aplique pelo menos um filtro para carregar o histórico.
          </div>
        )}
      </div>
    </Modal>
  )
}

function movementLabel(movement: CashMovement) {
  if (movement.type === 'expense') {
    return 'Gasto'
  }

  return movement.origin === 'sale' ? 'Venda' : 'Entrada avulsa'
}

function movementDescription(movement: CashMovement) {
  if (movement.origin !== 'sale') {
    return movement.description
  }

  const productNames = movement.sale?.sale_items
    ?.map((item) => item.product?.name)
    .filter(Boolean)

  return productNames?.length ? productNames.join(', ') : movement.description
}

function shortCode(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`
}

function paymentLabel(method?: string | null) {
  const labels: Record<string, string> = {
    dinheiro: 'Dinheiro',
    pix: 'Pix',
    cartao_debito: 'Cartão de débito',
    cartao_credito: 'Cartão de crédito',
    outro: 'Outro',
  }

  return method ? labels[method] ?? method : '-'
}
