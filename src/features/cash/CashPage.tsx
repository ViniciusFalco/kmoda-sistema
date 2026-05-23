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
  const mainActionClick = () => {
    if (isCashOpen) {
      setActiveModal('close-session')
      return
    }

    if (hasPreviousOpenSession) {
      setActiveModal('close-session')
      return
    }

    setActiveModal('open-session')
  }
  const handleOpenSale = () => setActiveModal('sale')
  const handleOpenExpense = () => setActiveModal('expense')

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(135deg,#050505_0%,#121212_48%,#0a0a0a_100%)] px-6 pt-8 pb-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:px-8 sm:pt-10 sm:pb-6 lg:px-10 lg:pt-12 lg:pb-7">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl text-left">
              <h1 className="text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                Caixa
              </h1>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
              <ActionCard
                compact
                tone="dark"
                title="Nova venda"
                description="Registrar entrada"
                icon={<ShoppingBag className="h-5 w-5" />}
                accent="green"
                onClick={handleOpenSale}
              />
              <ActionCard
                compact
                tone="dark"
                title="Novo gasto"
                description="Registrar saída"
                icon={<ArrowDownCircle className="h-5 w-5" />}
                accent="red"
                onClick={handleOpenExpense}
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={mainActionClick}
                aria-pressed={isCashOpen}
                className={`group flex w-full max-w-[17rem] items-center justify-between rounded-full border px-2 py-1.5 text-left transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isCashOpen
                    ? 'border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/14 focus:ring-emerald-300/35 focus:ring-offset-emerald-950'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 focus:ring-white/20 focus:ring-offset-zinc-950'
                }`}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.24em] transition ${
                    isCashOpen ? 'text-white/30' : 'text-white/85'
                  }`}
                >
                  Fechado
                </span>

                <span
                  className={`mx-2 flex h-7 w-14 shrink-0 items-center rounded-full border p-1 transition-colors ${
                    isCashOpen
                      ? 'border-emerald-300/25 bg-emerald-400/15'
                      : 'border-white/10 bg-white/10'
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full shadow-sm transition-transform duration-300 ${
                      isCashOpen ? 'translate-x-6 bg-emerald-400' : 'translate-x-0 bg-white'
                    }`}
                  />
                </span>

                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.24em] transition ${
                    isCashOpen ? 'text-white/85' : 'text-white/30'
                  }`}
                >
                  Aberto
                </span>
              </button>

            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard tone="dark" label="Dinheiro no Caixa" value={formatCurrencyBRL(dinheiroNoCaixa)} icon={<Wallet className="h-5 w-5" />} />
        <SummaryCard tone="dark" accent="green" label="Entradas do dia" value={formatCurrencyBRL(totals.income)} icon={<ArrowUpCircle className="h-5 w-5" />} />
        <SummaryCard tone="dark" accent="red" label="Gastos do dia" value={formatCurrencyBRL(totals.expense)} icon={<ArrowDownCircle className="h-5 w-5" />} />
      </div>

      {showReminder && previousOpenSession ? (
        <div className="rounded-3xl border border-amber-500/20 bg-[#0a0a0a] px-5 py-4 text-sm text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <p className="font-semibold text-white">Caixa anterior aberto</p>
                <p className="mt-1 text-white/60">
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
        <div className="rounded-3xl border border-white/10 bg-[#050505] px-5 py-4 text-sm text-white shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-300" />
              <div>
                <p className="font-semibold text-white">Teste interno</p>
                <p className="mt-1 text-white/55">Lembrete de caixa aberto para validação visual.</p>
              </div>
            </div>
            <Button tone="dark" variant="secondary" size="sm" onClick={() => setTestReminderVisible(false)}>
              Fechar teste
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
        <div className="relative border-b border-white/10 bg-[#050505] px-5 py-5 text-white">
          <button
            type="button"
            onClick={() => setActiveModal('history')}
            aria-label="Abrir histórico"
            className="absolute right-5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white text-black transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            <History className="h-4 w-4" />
          </button>

          <h2 className="text-center text-base font-semibold tracking-[-0.02em] sm:text-lg">
            Históricos do dia
          </h2>
          <p className="mt-1 text-center text-sm text-white/55">
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
                <table className="w-full min-w-[760px] border-collapse bg-[#050505] text-left text-sm text-white">
                  <thead className="bg-black text-xs uppercase text-white">
                    <tr>
                      <th className="px-4 py-3 font-bold tracking-[0.08em]">ID</th>
                      <th className="px-4 py-3 font-bold tracking-[0.08em]">Tipo</th>
                      <th className="px-4 py-3 font-bold tracking-[0.08em]">Descrição</th>
                      <th className="px-4 py-3 font-bold tracking-[0.08em]">Valor</th>
                      <th className="px-4 py-3 font-bold tracking-[0.08em]">Data</th>
                      <th className="px-4 py-3 font-bold tracking-[0.08em]">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {historyEntries.map((entry) => {
                      const isSession = entry.kind === 'session'
                      const isIncome = !isSession && entry.type === 'income'

                      return (
                        <tr
                          key={entry.id}
                          className={`cursor-pointer transition ${
                            isSession
                              ? 'bg-zinc-800/85 text-white hover:bg-zinc-700/85'
                              : isIncome
                                ? 'bg-emerald-500/10 text-white hover:bg-emerald-500/15'
                                : 'bg-rose-500/10 text-white hover:bg-rose-500/15'
                          }`}
                          onClick={() => setSelectedHistoryEntry(entry)}
                        >
                          <td className={`px-4 py-3 text-xs font-medium ${isSession ? 'text-white/65' : 'text-white/55'}`}>
                            {entry.movement_code ?? shortCode(entry.id)}
                          </td>
                          <td className="px-4 py-3">
                            {isSession ? (
                              <Badge tone="dark" variant="neutral">{entry.eventType === 'open' ? 'Abertura' : 'Fechamento'}</Badge>
                            ) : (
                              <Badge tone="dark" variant={entry.type === 'income' ? 'success' : 'warning'}>
                                {movementLabel(entry)}
                              </Badge>
                            )}
                          </td>
                          <td className={`px-4 py-3 font-medium ${isSession ? 'text-white' : 'text-white'}`}>
                            {isSession
                              ? entry.eventType === 'open'
                                ? 'Abertura de caixa'
                                : 'Fechamento de caixa'
                              : movementDescription(entry)}
                          </td>
                          <td className={`px-4 py-3 ${isSession ? 'text-white/75' : isIncome ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {isSession ? '' : entry.type === 'income' ? '+' : '-'}
                            {formatCurrencyBRL(entry.amount)}
                          </td>
                          <td className="px-4 py-3 text-white/75">{formatDateBR(entry.movement_date)}</td>
                          <td className="px-4 py-3 text-white/75">{isSession ? '-' : paymentLabel(entry.payment_method)}</td>
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

      <Modal open={activeModal === 'sale'} title="Nova venda" onClose={closeSaleModal} size="6xl" tone="dark">
        <CashSaleForm
          onCancel={closeSaleModal}
          onSaved={() => void handleSaved()}
          onOpenCash={() => setActiveModal('open-session')}
          cashSessionId={isCashOpen ? cashSession.id : null}
          sessionClosed={!isCashOpen}
          initialBarcode={saleBarcodePrefill}
        />
      </Modal>

      <Modal open={activeModal === 'expense'} title="Novo gasto" onClose={() => setActiveModal(null)} size="lg" tone="dark">
        <CashExpenseForm
          onCancel={() => setActiveModal(null)}
          onSaved={() => void handleSaved()}
          onOpenCash={() => setActiveModal('open-session')}
          cashSessionId={isCashOpen ? cashSession.id : null}
          sessionClosed={!isCashOpen}
        />
      </Modal>

      <Modal open={activeModal === 'open-session'} title="Abrir caixa" onClose={() => setActiveModal(null)} size="lg" tone="dark">
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

      <Modal open={activeModal === 'close-session' && sessionToClose !== null} title="Fechar caixa" onClose={() => setActiveModal(null)} size="2xl" tone="dark">
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
