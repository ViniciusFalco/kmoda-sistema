import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, History, ShoppingBag, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ActionCard } from '../../components/ui/ActionCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { SummaryCard } from '../../components/ui/SummaryCard'
import {
  friendlyCatalogError,
  getLastClosedCashSession,
  getPreviousOpenCashSession,
  getTodayCashSession,
  listTodayCashHistory,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR, todayISODate } from '../../lib/utils'
import type { CashHistoryEntry, CashHistoryMovement, CashMovement, CashSession } from '../../types/database'
import { CashExpenseForm } from './CashExpenseForm'
import { CashHistorySearchModal } from './CashHistorySearchModal'
import { CashMovementDetailsModal } from './CashMovementDetailsModal'
import { CashSaleForm } from './CashSaleForm'
import { CloseCashSessionForm, OpenCashSessionForm } from './CashSessionModals'

type CashModal = 'sale' | 'expense' | 'history' | 'open-session' | 'close-session' | null

export function CashPage() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const initialModal = searchParams.get('acao') === 'nova-venda' ? 'sale' : null
  const initialSaleBarcode = searchParams.get('barcode') ?? ''
  const [activeModal, setActiveModal] = useState<CashModal>(initialModal)
  const [saleBarcodePrefill, setSaleBarcodePrefill] = useState(initialSaleBarcode)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<CashHistoryEntry | null>(null)
  const [historyEntries, setHistoryEntries] = useState<CashHistoryEntry[]>([])
  const [cashSession, setCashSession] = useState<CashSession | null>(null)
  const [previousOpenSession, setPreviousOpenSession] = useState<CashSession | null>(null)
  const [lastClosedSession, setLastClosedSession] = useState<CashSession | null>(null)
  const [showPreviousAlert, setShowPreviousAlert] = useState(false)
  const [testReminderVisible, setTestReminderVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cashMovements = useMemo(
    () => historyEntries.filter((entry): entry is CashHistoryMovement => entry.kind === 'movement'),
    [historyEntries],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [historyRows, todaySession, previousSession, closedSession] = await Promise.all([
        listTodayCashHistory(todayISODate()),
        getTodayCashSession(todayISODate()),
        getPreviousOpenCashSession(todayISODate()),
        getLastClosedCashSession(),
      ])
      setHistoryEntries(historyRows)
      setCashSession(todaySession)
      setPreviousOpenSession(previousSession)
      setLastClosedSession(closedSession)
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
        const [rows, todaySession, previousSession, closedSession] = await Promise.all([
          listTodayCashHistory(todayISODate()),
          getTodayCashSession(todayISODate()),
          getPreviousOpenCashSession(todayISODate()),
          getLastClosedCashSession(),
        ])
        if (active) {
          setHistoryEntries(rows)
          setCashSession(todaySession)
          setPreviousOpenSession(previousSession)
          setLastClosedSession(closedSession)
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
    const income = cashMovements
      .filter((movement) => movement.type === 'income')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const expense = cashMovements
      .filter((movement) => movement.type === 'expense')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return {
      income,
      expense,
      balance: (cashSession?.opening_amount ?? 0) + income - expense,
    }
  }, [cashMovements, cashSession?.opening_amount])

  const dinheiroNoCaixa = useMemo(() => {
    if (cashSession?.status !== 'open') {
      return 0
    }

    const cashIncome = cashMovements
      .filter((movement) => movement.type === 'income' && movement.payment_method === 'dinheiro')
      .reduce((sum, movement) => sum + movement.amount, 0)

    const cashExpense = cashMovements
      .filter((movement) => movement.type === 'expense' && movement.payment_method === 'dinheiro')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return (cashSession?.opening_amount ?? 0) + cashIncome - cashExpense
  }, [cashMovements, cashSession?.opening_amount, cashSession?.status])

  async function handleSaved() {
    setSaleBarcodePrefill('')
    setActiveModal(null)
    await loadData()
  }

  function closeSaleModal() {
    setSaleBarcodePrefill('')
    setActiveModal(null)
  }

  const isCashOpen = cashSession?.status === 'open'
  const hasPreviousOpenSession = Boolean(previousOpenSession)
  const showReminder = hasPreviousOpenSession ? showPreviousAlert : testReminderVisible
  const sessionToClose = isCashOpen ? cashSession : previousOpenSession
  const handleOpenSale = () => setActiveModal('sale')
  const handleOpenExpense = () => setActiveModal('expense')

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="rounded-xl border-2 border-gray-200 bg-white p-4 text-center shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-[-0.04em] text-gray-950">Registrar</h1>
          </div>

          <div className="mt-4 grid gap-2">
            <ActionCard
              compact
              title="Nova venda"
              description="Registrar entrada"
              icon={<ShoppingBag className="h-5 w-5" />}
              accent="green"
              appearance="classic"
              onClick={handleOpenSale}
            />
            <ActionCard
              compact
              title="Nova despesa"
              description="Registrar saída"
              icon={<ArrowDownCircle className="h-5 w-5" />}
              accent="red"
              appearance="classic"
              onClick={handleOpenExpense}
            />
          </div>
        </section>

        <section className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <SummaryCard label="Dinheiro no Caixa" value={formatCurrencyBRL(dinheiroNoCaixa)} icon={<Wallet className="h-5 w-5" />} />
            <SummaryCard accent="green" label="Entradas do dia" value={formatCurrencyBRL(totals.income)} icon={<ArrowUpCircle className="h-5 w-5" />} />
            <SummaryCard accent="red" label="Gastos do dia" value={formatCurrencyBRL(totals.expense)} icon={<ArrowDownCircle className="h-5 w-5" />} />
          </div>

          {showReminder && previousOpenSession ? (
            <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="font-semibold text-amber-900">Caixa anterior aberto</p>
                    <p className="mt-1 text-amber-800">
                      Existe um caixa aberto de {formatDateBR(previousOpenSession.session_date)} que ainda não foi fechado.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="h-11 px-5"
                    onClick={() => {
                      setActiveModal('close-session')
                    }}
                  >
                    Fechar caixa anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowPreviousAlert(false)}
                    className="h-11 px-5"
                  >
                    Lembrar depois
                  </Button>
                </div>
              </div>
            </div>
          ) : showReminder ? (
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-900 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  <div>
                    <p className="font-semibold text-gray-900">Teste interno</p>
                    <p className="mt-1 text-gray-600">Lembrete de caixa aberto para validação visual.</p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setTestReminderVisible(false)}>
                  Fechar teste
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="relative border-b-2 border-gray-100 px-5 py-4 text-gray-950">
          <button
            type="button"
            onClick={() => setActiveModal('history')}
            aria-label="Abrir histórico"
            className="absolute right-5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-100"
          >
            <History className="h-4 w-4" />
          </button>

          <h2 className="text-center text-sm font-semibold tracking-[-0.02em] sm:text-base">
            Históricos do dia
          </h2>
          <p className="mt-1 text-center text-sm text-gray-500">
            Lançamentos de {formatDateBR(todayISODate())}. Clique em uma linha para ver detalhes.
          </p>
        </div>

        <div className="px-5 pb-5 pt-4">
          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Carregando caixa...
            </div>
          ) : historyEntries.length === 0 ? (
            <EmptyState title="Nenhum lançamento hoje." description="Registre uma venda ou um gasto para começar." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
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
                    {historyEntries.map((entry) => {
                      const isSession = entry.kind === 'session'
                      const isIncome = !isSession && entry.type === 'income'

                      return (
                        <tr
                          key={entry.id}
                          className={`cursor-pointer transition ${
                            isSession
                              ? 'bg-gray-50 text-gray-900 hover:bg-gray-100'
                              : isIncome
                                ? 'bg-emerald-50 text-gray-900 hover:bg-emerald-100'
                                : 'bg-rose-50 text-gray-900 hover:bg-rose-100'
                          }`}
                          onClick={() => setSelectedHistoryEntry(entry)}
                        >
                          <td className={`px-4 py-3 text-xs font-medium ${isSession ? 'text-gray-500' : 'text-gray-500'}`}>
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
                          <td className="px-4 py-3 text-gray-600">{isSession ? '-' : paymentLabel(entry.payment_method)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          onClick={() => setTestReminderVisible(true)}
        >
          Teste
        </Button>
      </div>

      <Modal open={activeModal === 'sale'} title="Nova venda" onClose={closeSaleModal} size="6xl">
        <CashSaleForm
          onCancel={closeSaleModal}
          onSaved={() => void handleSaved()}
          onOpenCash={() => setActiveModal('open-session')}
          cashSessionId={isCashOpen ? cashSession.id : null}
          sessionClosed={!isCashOpen}
          initialBarcode={saleBarcodePrefill}
        />
      </Modal>

      <Modal open={activeModal === 'expense'} title="Nova despesa" onClose={() => setActiveModal(null)} size="lg">
        <CashExpenseForm
          onCancel={() => setActiveModal(null)}
          onSaved={() => void handleSaved()}
          onOpenCash={() => setActiveModal('open-session')}
          cashSessionId={isCashOpen ? cashSession.id : null}
          sessionClosed={!isCashOpen}
        />
      </Modal>

      <Modal open={activeModal === 'open-session'} title="Abrir caixa" onClose={() => setActiveModal(null)} size="lg">
        <OpenCashSessionForm
          onCancel={() => setActiveModal(null)}
          lastClosedSession={lastClosedSession}
          onSaved={(session) => {
            setCashSession(session)
            setShowPreviousAlert(false)
            setTestReminderVisible(false)
            setActiveModal(null)
          }}
        />
      </Modal>

      <Modal open={activeModal === 'close-session' && sessionToClose !== null} title="Fechar caixa" onClose={() => setActiveModal(null)} size="2xl">
        {sessionToClose ? (
          <CloseCashSessionForm
            session={sessionToClose}
            income={totals.income}
            expense={totals.expense}
            onCancel={() => setActiveModal(null)}
            onSaved={(session) => {
              setCashSession(session)
              setLastClosedSession(session)
              setActiveModal(null)
              setShowPreviousAlert(false)
              setTestReminderVisible(false)
              setPreviousOpenSession(null)
            }}
          />
        ) : null}
      </Modal>

      <CashHistorySearchModal
        open={activeModal === 'history'}
        onClose={() => setActiveModal(null)}
        onSelectEntry={setSelectedHistoryEntry}
      />

      <CashMovementDetailsModal entry={selectedHistoryEntry} onClose={() => setSelectedHistoryEntry(null)} />
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
    ?.map((item) => item.product?.product_model?.name ?? item.product?.name)
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
