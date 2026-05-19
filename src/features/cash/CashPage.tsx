import { ArrowDownCircle, ArrowUpCircle, History, Plus, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { SummaryCard } from '../../components/ui/SummaryCard'
import {
  friendlyCatalogError,
  listTodayCashMovements,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR, todayISODate } from '../../lib/utils'
import type { CashMovement } from '../../types/database'
import { CashExpenseForm } from './CashExpenseForm'
import { CashHistorySearchModal } from './CashHistorySearchModal'
import { CashMovementDetailsModal } from './CashMovementDetailsModal'
import { CashSaleForm } from './CashSaleForm'

type CashModal = 'sale' | 'expense' | 'history' | null

export function CashPage() {
  const location = useLocation()
  const initialModal = new URLSearchParams(location.search).get('acao') === 'nova-venda' ? 'sale' : null
  const [activeModal, setActiveModal] = useState<CashModal>(initialModal)
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setMovements(await listTodayCashMovements(todayISODate()))
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      try {
        const rows = await listTodayCashMovements(todayISODate())
        if (active) {
          setMovements(rows)
        }
      } catch (err) {
        if (active) {
          setError(friendlyCatalogError(err))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInitial()

    return () => {
      active = false
    }
  }, [])

  const totals = useMemo(() => {
    const income = movements
      .filter((movement) => movement.type === 'income')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const expense = movements
      .filter((movement) => movement.type === 'expense')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return {
      income,
      expense,
      balance: income - expense,
    }
  }, [movements])

  async function handleSaved() {
    setActiveModal(null)
    await loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-950">Caixa</h1>
          <p className="mt-1 text-sm text-gray-500">Registre vendas, gastos e acompanhe o movimento financeiro do dia.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setActiveModal('sale')} className="h-11 px-5">
            <Plus className="h-4 w-4" />
            Nova venda
          </Button>
          <Button variant="secondary" onClick={() => setActiveModal('expense')} className="h-11 px-5">
            <ArrowDownCircle className="h-4 w-4" />
            Novo gasto
          </Button>
          <Button variant="secondary" onClick={() => setActiveModal('history')} className="h-11 px-5">
            <History className="h-4 w-4" />
            Buscar histórico
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Saldo do dia" value={formatCurrencyBRL(totals.balance)} icon={<Wallet className="h-5 w-5" />} />
        <SummaryCard label="Entradas do dia" value={formatCurrencyBRL(totals.income)} icon={<ArrowUpCircle className="h-5 w-5" />} />
        <SummaryCard label="Gastos do dia" value={formatCurrencyBRL(totals.expense)} icon={<ArrowDownCircle className="h-5 w-5" />} />
      </div>

      <Card
        title="Histórico do dia"
        description={`Lançamentos de ${formatDateBR(todayISODate())}. Clique em uma linha para ver detalhes.`}
        action={<p className="text-sm font-semibold text-gray-950">Saldo: {formatCurrencyBRL(totals.balance)}</p>}
      >
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Carregando caixa...
          </div>
        ) : movements.length === 0 ? (
          <EmptyState title="Nenhum lançamento hoje." description="Registre uma venda ou um gasto para começar." />
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
                  {movements.map((movement) => (
                    <tr
                      key={movement.id}
                      className={`cursor-pointer text-gray-700 transition ${movement.type === 'income' ? 'bg-emerald-50/40 hover:bg-emerald-50' : 'bg-rose-50/40 hover:bg-rose-50'}`}
                      onClick={() => setSelectedMovement(movement)}
                    >
                      <td className="px-4 py-3 text-xs font-medium text-gray-500">
                        {movement.movement_code ?? shortCode(movement.id)}
                      </td>
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
      </Card>

      <Modal open={activeModal === 'sale'} title="Nova venda" onClose={() => setActiveModal(null)} size="6xl">
        <CashSaleForm onCancel={() => setActiveModal(null)} onSaved={() => void handleSaved()} />
      </Modal>

      <Modal open={activeModal === 'expense'} title="Novo gasto" onClose={() => setActiveModal(null)} size="lg">
        <CashExpenseForm onCancel={() => setActiveModal(null)} onSaved={() => void handleSaved()} />
      </Modal>

      <CashHistorySearchModal
        open={activeModal === 'history'}
        onClose={() => setActiveModal(null)}
        onSelectMovement={setSelectedMovement}
      />

      <CashMovementDetailsModal movement={selectedMovement} onClose={() => setSelectedMovement(null)} />
    </div>
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
