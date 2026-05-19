import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, History, Plus, Wallet } from 'lucide-react'
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
  getPreviousOpenCashSession,
  getTodayCashSession,
  listTodayCashMovements,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR, todayISODate } from '../../lib/utils'
import type { CashMovement, CashSession } from '../../types/database'
import { CashExpenseForm } from './CashExpenseForm'
import { CashHistorySearchModal } from './CashHistorySearchModal'
import { CashMovementDetailsModal } from './CashMovementDetailsModal'
import { CashSaleForm } from './CashSaleForm'
import { CloseCashSessionForm, OpenCashSessionForm } from './CashSessionModals'

type CashModal = 'sale' | 'expense' | 'history' | 'open-session' | 'close-session' | null

export function CashPage() {
  const location = useLocation()
  const initialModal = new URLSearchParams(location.search).get('acao') === 'nova-venda' ? 'sale' : null
  const [activeModal, setActiveModal] = useState<CashModal>(initialModal)
  const [selectedMovement, setSelectedMovement] = useState<CashMovement | null>(null)
  const [movements, setMovements] = useState<CashMovement[]>([])
  const [cashSession, setCashSession] = useState<CashSession | null>(null)
  const [previousOpenSession, setPreviousOpenSession] = useState<CashSession | null>(null)
  const [showPreviousAlert, setShowPreviousAlert] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [movementRows, todaySession, previousSession] = await Promise.all([
        listTodayCashMovements(todayISODate()),
        getTodayCashSession(todayISODate()),
        getPreviousOpenCashSession(todayISODate()),
      ])
      setMovements(movementRows)
      setCashSession(todaySession)
      setPreviousOpenSession(previousSession)
      setShowPreviousAlert(Boolean(previousSession))
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
        const [rows, todaySession, previousSession] = await Promise.all([
          listTodayCashMovements(todayISODate()),
          getTodayCashSession(todayISODate()),
          getPreviousOpenCashSession(todayISODate()),
        ])
        if (active) {
          setMovements(rows)
          setCashSession(todaySession)
          setPreviousOpenSession(previousSession)
          setShowPreviousAlert(Boolean(previousSession))
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
      balance: (cashSession?.opening_amount ?? 0) + income - expense,
    }
  }, [movements, cashSession?.opening_amount])

  async function handleSaved() {
    setActiveModal(null)
    await loadData()
  }

  return (
    <div className="space-y-6">
      {showPreviousAlert && previousOpenSession ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Caixa anterior ainda está aberto</p>
                <p className="mt-1">
                  Existe um caixa aberto de {formatDateBR(previousOpenSession.session_date)} que ainda não foi fechado.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setCashSession(previousOpenSession)
                  setActiveModal('close-session')
                }}
              >
                Fechar caixa anterior
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowPreviousAlert(false)}>
                Lembrar depois
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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

      <Card
        title={cashSession?.status === 'open' ? 'Caixa aberto' : cashSession?.status === 'closed' ? 'Caixa fechado' : 'Caixa do dia ainda não foi aberto'}
        description={
          cashSession
            ? `Data ${formatDateBR(cashSession.session_date)} · Valor inicial ${formatCurrencyBRL(cashSession.opening_amount)}`
            : 'Abra o caixa para registrar o valor inicial do dia.'
        }
        action={
          <div className="flex gap-2">
            {!cashSession ? (
              <Button onClick={() => setActiveModal('open-session')}>Abrir caixa</Button>
            ) : cashSession.status === 'open' ? (
              <Button variant="secondary" onClick={() => setActiveModal('close-session')}>Fechar caixa</Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // TODO: remover botão de teste antes da entrega final.
                setPreviousOpenSession({
                  id: 'test',
                  session_date: '2026-05-18',
                  opening_amount: 0,
                  status: 'open',
                  opened_at: '2026-05-18',
                  created_at: '2026-05-18',
                  updated_at: '2026-05-18',
                })
                setShowPreviousAlert(true)
              }}
            >
              Testar lembrete de caixa aberto
            </Button>
          </div>
        }
      >
        {cashSession?.status === 'closed' ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            Caixa fechado. Novos lançamentos ainda podem ser registrados, mas ficarão sem vínculo com caixa aberto.
          </div>
        ) : null}
      </Card>

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
        <CashSaleForm
          onCancel={() => setActiveModal(null)}
          onSaved={() => void handleSaved()}
          cashSessionId={cashSession?.status === 'open' ? cashSession.id : null}
          sessionClosed={cashSession?.status === 'closed'}
        />
      </Modal>

      <Modal open={activeModal === 'expense'} title="Novo gasto" onClose={() => setActiveModal(null)} size="lg">
        <CashExpenseForm
          onCancel={() => setActiveModal(null)}
          onSaved={() => void handleSaved()}
          cashSessionId={cashSession?.status === 'open' ? cashSession.id : null}
          sessionClosed={cashSession?.status === 'closed'}
        />
      </Modal>

      <Modal open={activeModal === 'open-session'} title="Abrir caixa" onClose={() => setActiveModal(null)} size="lg">
        <OpenCashSessionForm
          onCancel={() => setActiveModal(null)}
          onSaved={(session) => {
            setCashSession(session)
            setActiveModal(null)
          }}
        />
      </Modal>

      <Modal open={activeModal === 'close-session' && cashSession !== null} title="Fechar caixa" onClose={() => setActiveModal(null)} size="2xl">
        {cashSession ? (
          <CloseCashSessionForm
            session={cashSession}
            income={totals.income}
            expense={totals.expense}
            onCancel={() => setActiveModal(null)}
            onSaved={(session) => {
              setCashSession(session)
              setActiveModal(null)
              setShowPreviousAlert(false)
            }}
          />
        ) : null}
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
