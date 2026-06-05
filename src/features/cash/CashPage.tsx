import {
  ArrowDownCircle,
  ArrowUpCircle,
  Lock,
  LockOpen,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import {
  friendlyCatalogError,
  getLastClosedCashSession,
  getPreviousOpenCashSession,
  getTodayCashSession,
  listCashMovementsForSession,
  listTodayCashHistory,
  formatSalePaymentSummary,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR, todayISODate } from '../../lib/utils'
import type { CashHistoryEntry, CashHistoryMovement, CashMovement, CashSession } from '../../types/database'
import { CashExpenseForm } from './CashExpenseForm'
import { CashHistorySearchModal } from './CashHistorySearchModal'
import { CashMovementDetailsModal } from './CashMovementDetailsModal'
import { CashSaleCompletionModal } from './CashSaleCompletionModal'
import { CashSaleForm } from './CashSaleForm'
import { CloseCashSessionForm, OpenCashSessionForm } from './CashSessionModals'

type CashModal = 'sale' | 'expense' | 'history' | 'overview' | 'daily-history' | 'open-session' | 'close-session' | null

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
  const [saleHeaderCenter, setSaleHeaderCenter] = useState<ReactNode | null>(null)
  const [saleCompletionTestOpen, setSaleCompletionTestOpen] = useState(false)
  const [sessionMovements, setSessionMovements] = useState<CashMovement[]>([])
  const [sessionMovementsLoading, setSessionMovementsLoading] = useState(false)
  const [sessionMovementsRefreshKey, setSessionMovementsRefreshKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const todayMovements = useMemo(
    () => historyEntries.filter((entry): entry is CashHistoryMovement => entry.kind === 'movement'),
    [historyEntries],
  )

  const sessionForDetails = cashSession?.status === 'open' ? cashSession : previousOpenSession ?? cashSession
  const sessionForDetailsId = sessionForDetails?.id
  const sessionForDetailsOpenedAt = sessionForDetails?.opened_at
  const sessionToClose = sessionForDetails?.status === 'open' ? sessionForDetails : null
  const isCashOpen = Boolean(sessionToClose)
  const recentMovements = useMemo(
    () =>
      [...sessionMovements]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [sessionMovements],
  )
  const overviewDescription = loading
    ? 'Carregando dados do caixa.'
    : isCashOpen
      ? 'Resumo da sessão atual e lançamentos recentes.'
      : 'Resumo do último fechamento e lançamentos do dia.'

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true)
    }
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
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      try {
        setLoading(true)
        setError('')

        const [historyRows, todaySession, previousSession, closedSession] = await Promise.all([
          listTodayCashHistory(todayISODate()),
          getTodayCashSession(todayISODate()),
          getPreviousOpenCashSession(todayISODate()),
          getLastClosedCashSession(),
        ])

        if (active) {
          setHistoryEntries(historyRows)
          setCashSession(todaySession)
          setPreviousOpenSession(previousSession)
          setLastClosedSession(closedSession)
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

  useEffect(() => {
    let active = true

    async function loadSessionMovements() {
      if (!sessionForDetailsId || !sessionForDetailsOpenedAt) {
        setSessionMovements([])
        setSessionMovementsLoading(false)
        return
      }

      setSessionMovementsLoading(true)

      try {
        const rows = await listCashMovementsForSession(sessionForDetailsId, sessionForDetailsOpenedAt)
        if (active) {
          setSessionMovements(rows)
        }
      } catch (err) {
        if (active) {
          setError(friendlyCatalogError(err))
        }
      } finally {
        if (active) {
          setSessionMovementsLoading(false)
        }
      }
    }

    void loadSessionMovements()

    return () => {
      active = false
    }
  }, [sessionForDetailsId, sessionForDetailsOpenedAt, sessionMovementsRefreshKey])

  const dayTotals = useMemo(() => {
    const income = todayMovements
      .filter((movement) => movement.type === 'income')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const expense = todayMovements
      .filter((movement) => movement.type === 'expense')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return { income, expense }
  }, [todayMovements])

  const sessionTotals = useMemo(() => {
    const income = sessionMovements
      .filter((movement) => movement.type === 'income')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const expense = sessionMovements
      .filter((movement) => movement.type === 'expense')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return { income, expense }
  }, [sessionMovements])

  const dinheiroNoCaixa = useMemo(() => {
    if (!sessionForDetails || sessionForDetails.status !== 'open') {
      return 0
    }

    return (sessionForDetails.opening_amount ?? 0) + sessionTotals.income - sessionTotals.expense
  }, [sessionForDetails, sessionTotals.expense, sessionTotals.income])

  const statusLabel = loading ? 'Carregando caixa...' : isCashOpen ? 'Caixa aberto' : 'Caixa fechado'
  const statusDescription = loading
    ? 'Aguarde enquanto os dados do caixa são carregados.'
    : isCashOpen
      ? `Aberto em ${formatDateTimeBR(sessionForDetails?.opened_at ?? sessionForDetails?.session_date ?? todayISODate())}.`
      : lastClosedSession
        ? `Último fechamento em ${formatDateTimeBR(lastClosedSession.closed_at ?? lastClosedSession.updated_at ?? lastClosedSession.session_date)}.`
        : 'Nenhum caixa aberto no momento.'

  async function handleSaved() {
    setSaleBarcodePrefill('')
    setActiveModal(null)
    await loadData()
    setSessionMovementsRefreshKey((current) => current + 1)
  }

  function closeSaleModal() {
    setSaleBarcodePrefill('')
    setActiveModal(null)
    setSaleHeaderCenter(null)
  }

  return (
    <div className="flex h-[calc(100dvh-12rem)] w-full min-w-0 flex-col gap-2.5 overflow-hidden [@media(max-height:820px)]:h-auto [@media(max-height:820px)]:gap-2 [@media(max-height:820px)]:overflow-y-auto">
      <section className="shrink-0 rounded-md border-2 border-gray-300 bg-white p-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.05)] [@media(max-height:820px)]:p-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between [@media(max-height:820px)]:gap-2">
          <div className="flex items-start gap-3 [@media(max-height:820px)]:gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 [@media(max-height:820px)]:h-8 [@media(max-height:820px)]:w-8 ${
                isCashOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-300 bg-gray-50 text-gray-500'
              }`}
            >
              {isCashOpen ? <LockOpen className="h-5 w-5 [@media(max-height:820px)]:h-4 [@media(max-height:820px)]:w-4" /> : <Lock className="h-5 w-5 [@media(max-height:820px)]:h-4 [@media(max-height:820px)]:w-4" />}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500">Status do caixa</p>
              <h1 className="text-xl font-semibold tracking-[-0.04em] text-gray-950 sm:text-2xl [@media(max-height:820px)]:text-lg">{statusLabel}</h1>
              <p className="mt-1 text-xs leading-5 text-gray-600 sm:text-sm [@media(max-height:820px)]:mt-0.5 [@media(max-height:820px)]:text-[11px] [@media(max-height:820px)]:leading-4">{statusDescription}</p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => setActiveModal(isCashOpen ? 'close-session' : 'open-session')}
            className={`inline-flex min-w-[150px] items-center justify-center rounded-md border-2 px-4 py-2 text-sm font-semibold shadow-[0_4px_0_rgba(15,23,42,0.04)] transition focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 [@media(max-height:820px)]:min-w-[132px] [@media(max-height:820px)]:px-3 [@media(max-height:820px)]:py-1.5 [@media(max-height:820px)]:text-xs ${
              isCashOpen
                ? 'border-gray-900 bg-white text-gray-950 hover:bg-gray-50'
                : 'border-gray-900 bg-gray-900 text-white hover:bg-black'
            }`}
          >
            {isCashOpen ? 'Fechar caixa' : 'Abrir caixa'}
          </button>
        </div>
      </section>

      <section className="shrink-0 rounded-md border-2 border-gray-300 bg-white p-2.5 shadow-[0_6px_18px_rgba(15,23,42,0.05)] [@media(max-height:820px)]:p-2">
        <div className="grid grid-cols-2 auto-rows-[6.75rem] gap-2 sm:auto-rows-[7rem] [@media(max-height:820px)]:auto-rows-[5.75rem] [@media(max-height:820px)]:gap-1.5">
          <CashMenuButton title="Registrar venda" active={activeModal === 'sale'} disabled={loading} onClick={() => setActiveModal('sale')} />
          <CashMenuButton
            title="Registrar despesa"
            active={activeModal === 'expense'}
            disabled={loading}
            onClick={() => setActiveModal('expense')}
          />
          <CashMenuButton
            title="Histórico do dia"
            active={activeModal === 'daily-history'}
            disabled={loading}
            onClick={() => setActiveModal('daily-history')}
          />
          <CashMenuButton
            title="Histórico por pesquisa"
            active={activeModal === 'history'}
            disabled={loading}
            onClick={() => setActiveModal('history')}
          />
          <div className="sm:col-span-2">
            <CashMenuButton
              title="Visão geral"
              active={activeModal === 'overview'}
              disabled={loading}
              onClick={() => setActiveModal('overview')}
            />
          </div>
        </div>
      </section>

      <section className="grid shrink-0 grid-cols-3 gap-1 [@media(max-height:820px)]:gap-0.5">
        <CashMetricCard label="Dinheiro no caixa" value={formatCurrencyBRL(dinheiroNoCaixa)} icon={<Wallet className="h-4 w-4" />} />
        <CashMetricCard label="Entradas do dia" value={formatCurrencyBRL(dayTotals.income)} icon={<ArrowUpCircle className="h-4 w-4" />} accent="green" />
        <CashMetricCard label="Despesas do dia" value={formatCurrencyBRL(dayTotals.expense)} icon={<ArrowDownCircle className="h-4 w-4" />} accent="red" />
      </section>

      <section className="shrink-0 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setSaleCompletionTestOpen(true)}
          className="border-gray-300 bg-white text-gray-700 shadow-sm hover:border-gray-900 hover:text-gray-900"
        >
          Testar animação de venda
        </Button>
      </section>

      {error ? (
        <div className="shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      ) : null}

      <Modal open={activeModal === 'overview'} title="Visão geral" onClose={() => setActiveModal(null)} size="5xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{overviewDescription}</p>

          {loading ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Carregando caixa...
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
              <div className="rounded-md border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Estado atual</p>

                {isCashOpen && sessionForDetails ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <OverviewField label="Abertura" value={formatDateTimeBR(sessionForDetails.opened_at)} />
                      <OverviewField label="Valor inicial" value={formatCurrencyBRL(sessionForDetails.opening_amount ?? 0)} />
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
                      {sessionForDetails.notes ? sessionForDetails.notes : 'Sem observação cadastrada para esta sessão.'}
                    </div>
                  </div>
                ) : lastClosedSession ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <OverviewField
                        label="Último fechamento"
                        value={formatDateTimeBR(lastClosedSession.closed_at ?? lastClosedSession.updated_at ?? lastClosedSession.session_date)}
                      />
                      <OverviewField label="Valor fechado" value={formatCurrencyBRL(lastClosedSession.closing_amount ?? 0)} />
                      <OverviewField label="Diferença" value={formatCurrencyBRL(lastClosedSession.difference_amount ?? 0)} />
                      <OverviewField label="Valor esperado" value={formatCurrencyBRL(lastClosedSession.expected_amount ?? 0)} />
                    </div>
                    <div className="rounded-md border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700">
                      {lastClosedSession.notes ? lastClosedSession.notes : 'Nenhuma observação no último fechamento.'}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyState title="Caixa fechado" description="Abra o caixa para iniciar os lançamentos do dia." />
                  </div>
                )}
              </div>

              <div className="rounded-md border-2 border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Movimentações recentes</p>

                {sessionMovementsLoading ? (
                  <p className="mt-3 text-sm text-gray-500">Carregando movimentações...</p>
                ) : recentMovements.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {recentMovements.map((movement) => (
                      <CashDetailItem
                        key={movement.id}
                        description={movementDescription(movement)}
                        amount={movement.amount}
                        amountTone={movement.type === 'income' ? 'income' : 'expense'}
                        timestamp={formatMovementTimestamp(movement.created_at, sessionForDetails?.opened_at)}
                        prefix={movement.type === 'income' ? '+' : '-'}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <EmptyState
                      title="Nenhuma movimentação registrada."
                      description="As entradas e despesas da sessão aparecem aqui após os lançamentos."
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <CashSaleCompletionModal
        open={saleCompletionTestOpen}
        total={98}
        customerName="Cliente teste"
        onClose={() => setSaleCompletionTestOpen(false)}
      />

      <Modal open={activeModal === 'daily-history'} title="Histórico do dia" onClose={() => setActiveModal(null)} size="6xl">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Lançamentos de {formatDateBR(todayISODate())}. Clique em uma linha para ver detalhes.
          </p>

          {loading ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
              Carregando caixa...
            </div>
          ) : historyEntries.length === 0 ? (
            <EmptyState title="Nenhum lançamento hoje." description="Registre uma venda ou uma despesa para começar." />
          ) : (
            <div className="overflow-hidden rounded-md border-2 border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm text-gray-700">
                  <thead className="bg-black text-[11px] uppercase tracking-[0.14em] text-gray-100">
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
                              ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                              : isIncome
                                ? 'bg-emerald-50 text-gray-900 hover:bg-emerald-100'
                                : 'bg-rose-50 text-gray-900 hover:bg-rose-100'
                          }`}
                          onClick={() => setSelectedHistoryEntry(entry)}
                        >
                          <td className="px-4 py-3 text-xs font-medium text-gray-500">{entry.movement_code ?? shortCode(entry.id)}</td>
                          <td className="px-4 py-3">
                            {isSession ? (
                              <Badge variant="neutral">{entry.eventType === 'open' ? 'Abertura' : 'Fechamento'}</Badge>
                            ) : (
                              <Badge variant={entry.type === 'income' ? 'success' : 'warning'}>{movementLabel(entry)}</Badge>
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
                          <td className="px-4 py-3 text-gray-600">
                            {isSession ? '-' : entry.origin === 'sale' ? formatSalePaymentSummary(entry.sale) : paymentLabel(entry.payment_method)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={activeModal === 'sale'}
        title="Nova venda"
        onClose={closeSaleModal}
        size="6xl"
        fullScreen
        bodyClassName="p-0"
        headerCenter={saleHeaderCenter}
      >
        <CashSaleForm
          onCancel={closeSaleModal}
          onSaved={() => void handleSaved()}
          onOpenCash={() => setActiveModal('open-session')}
          cashSessionId={isCashOpen ? sessionForDetails?.id ?? null : null}
          sessionClosed={!isCashOpen}
          initialBarcode={saleBarcodePrefill}
          onHeaderCenterChange={setSaleHeaderCenter}
        />
      </Modal>

      <Modal open={activeModal === 'expense'} title="Nova despesa" onClose={() => setActiveModal(null)} size="lg">
        <CashExpenseForm
          onCancel={() => setActiveModal(null)}
          onSaved={() => void handleSaved()}
          onOpenCash={() => setActiveModal('open-session')}
          cashSessionId={isCashOpen ? sessionForDetails?.id ?? null : null}
          sessionClosed={!isCashOpen}
        />
      </Modal>

      <Modal open={activeModal === 'open-session'} title="Abrir caixa" onClose={() => setActiveModal(null)} size="lg">
        <OpenCashSessionForm
          onCancel={() => setActiveModal(null)}
          lastClosedSession={lastClosedSession}
          onSaved={(session) => {
            setCashSession(session)
            setPreviousOpenSession(null)
            setActiveModal(null)
            void loadData()
          }}
        />
      </Modal>

      <Modal open={activeModal === 'close-session' && sessionToClose !== null} title="Fechar caixa" onClose={() => setActiveModal(null)} size="2xl">
        {sessionToClose ? (
          <CloseCashSessionForm
            session={sessionToClose}
            income={sessionTotals.income}
            expense={sessionTotals.expense}
            onCancel={() => setActiveModal(null)}
            onSaved={(session) => {
              setCashSession(session)
              setLastClosedSession(session)
              setActiveModal(null)
              setPreviousOpenSession(null)
              void loadData()
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

function CashMenuButton({
  title,
  active = false,
  disabled = false,
  onClick,
}: {
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={`group flex h-full w-full flex-col items-center justify-center gap-2 rounded-md border-2 px-3 text-center shadow-[0_4px_0_rgba(15,23,42,0.04)] transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 [@media(max-height:820px)]:gap-1.5 [@media(max-height:820px)]:px-2.5 ${
        active
          ? 'border-gray-950 bg-gray-950 text-white shadow-[0_6px_0_rgba(15,23,42,0.12)]'
          : 'border-gray-300 bg-white text-gray-800 hover:border-black hover:bg-gray-50 hover:text-black'
      }`}
    >
      <span
        className={`min-w-0 font-semibold leading-tight transition-all duration-200 ease-out group-hover:scale-[1.08] group-hover:text-[20px] [@media(max-height:820px)]:group-hover:text-[18px] ${
          active ? 'text-[18px] text-white [@media(max-height:820px)]:text-[16px]' : 'text-[19px] [@media(max-height:820px)]:text-[16px]'
        }`}
      >
        {title}
      </span>
    </button>
  )
}

function CashMetricCard({
  label,
  value,
  icon,
  accent = 'default',
}: {
  label: string
  value: string
  icon: ReactNode
  accent?: 'default' | 'green' | 'red'
}) {
  const accentStyles =
    accent === 'green'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : accent === 'red'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-gray-200 bg-gray-50 text-gray-700'

  return (
    <div className="flex h-32 w-full flex-col items-center justify-between rounded-md border-2 border-gray-200 bg-white px-3 py-3 text-center shadow-[0_4px_0_rgba(15,23,42,0.03)] [@media(max-height:820px)]:h-28 [@media(max-height:820px)]:py-2.5">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border [@media(max-height:820px)]:h-9 [@media(max-height:820px)]:w-9 ${accentStyles}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      </div>
      <p className="truncate text-[22px] font-semibold tracking-[-0.04em] text-gray-950 [@media(max-height:820px)]:text-[20px]">{value}</p>
    </div>
  )
}

function OverviewField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-950">{value}</p>
    </div>
  )
}

function CashDetailItem({
  description,
  amount,
  amountTone,
  timestamp,
  prefix,
}: {
  description: string
  amount: number
  amountTone: 'income' | 'expense'
  timestamp: string
  prefix: '+' | '-'
}) {
  const toneClass = amountTone === 'income' ? 'text-emerald-700' : 'text-rose-700'

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{description}</p>
          <p className="mt-1 text-[11px] text-gray-500">{timestamp}</p>
        </div>
        <p className={`shrink-0 text-sm font-semibold ${toneClass}`}>
          {prefix}
          {formatCurrencyBRL(amount)}
        </p>
      </div>
    </div>
  )
}

function movementLabel(movement: CashMovement) {
  if (movement.type === 'expense') {
    return 'Despesa'
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

function formatDateTimeBR(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatMovementTimestamp(value: string, sessionOpenedAt?: string) {
  const movementDate = new Date(value)
  const openDate = sessionOpenedAt ? new Date(sessionOpenedAt) : null
  const timeLabel = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(movementDate)

  if (!openDate || movementDate.toDateString() === openDate.toDateString()) {
    return timeLabel
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(movementDate)
}
