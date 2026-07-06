import { CheckCircle2, Search, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { PinConfirmationModal } from '../../components/auth/PinConfirmationModal'
import { Table } from '../../components/ui/Table'
import {
  friendlyCatalogError,
  formatPaymentMethodLabel,
  getPreviousOpenCashSession,
  getTodayCashSession,
  listPromissoryNotes,
  registerPromissoryInstallmentPayment,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR, todayISODate } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import type { PaymentMethod, PromissoryInstallment, PromissoryNote } from '../../types/database'

type PromissoryViewStatus = 'open' | 'paid' | 'cancelled' | 'overdue'
type PromissoryFilter = 'all' | PromissoryViewStatus

interface PaymentDraft {
  installment: PromissoryInstallment
  note: PromissoryNote
  paymentMethod: Exclude<PaymentMethod, 'promissoria'>
  movementDate: string
  notes: string
}

interface PromissoryRow extends PromissoryNote {
  viewStatus: PromissoryViewStatus
  nextInstallment: PromissoryInstallment | null
  overdueAmount: number
  remainingAmount: number
  paidAmount: number
}

const paymentMethodOptions: Array<{ value: Exclude<PaymentMethod, 'promissoria'>; label: string }> = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'cartao_debito', label: 'Débito' },
  { value: 'cartao_credito', label: 'Crédito' },
  { value: 'outro', label: 'Outro' },
]

const statusFilterOptions: Array<{ value: PromissoryFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Em aberto' },
  { value: 'overdue', label: 'Vencidas' },
  { value: 'paid', label: 'Quitadas' },
  { value: 'cancelled', label: 'Canceladas' },
]

export function PromissoriesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<PromissoryNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PromissoryFilter>('all')
  const [page, setPage] = useState(1)
  const [selectedNote, setSelectedNote] = useState<PromissoryNote | null>(null)
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [cashSessionId, setCashSessionId] = useState<string | null>(null)
  const [cashSessionOpen, setCashSessionOpen] = useState(false)

  const itemsPerPage = 8
  const today = todayISODate()

  useEffect(() => {
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [noteRows, todaySession, previousSession] = await Promise.all([
          listPromissoryNotes(),
          getTodayCashSession(today),
          getPreviousOpenCashSession(today),
        ])

        if (!active) {
          return
        }

        const sessionForPayments = todaySession?.status === 'open' ? todaySession : previousSession
        setNotes(noteRows)
        setCashSessionId(sessionForPayments?.status === 'open' ? sessionForPayments.id : null)
        setCashSessionOpen(Boolean(sessionForPayments && sessionForPayments.status === 'open'))
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

    void loadData()

    return () => {
      active = false
    }
  }, [today])

  const rows = useMemo<PromissoryRow[]>(() => {
    return notes.map((note) => {
      const installments = (note.installments ?? []).slice().sort((a, b) => a.installment_number - b.installment_number)
      const nextInstallment = installments.find((installment) => installment.status === 'pending') ?? null
      const overdueAmount = installments
        .filter((installment) => installment.status === 'pending' && installment.due_date < today)
        .reduce((sum, installment) => sum + installment.amount, 0)
      const paidAmount = installments
        .filter((installment) => installment.status === 'paid')
        .reduce((sum, installment) => sum + installment.amount, 0)
      const remainingAmount = Math.max(0, (note.total_amount ?? 0) - paidAmount)
      const viewStatus = note.status === 'cancelled'
        ? 'cancelled'
        : paidAmount >= note.total_amount - 0.01
          ? 'paid'
          : overdueAmount > 0
            ? 'overdue'
            : 'open'

      return {
        ...note,
        installments,
        nextInstallment,
        overdueAmount,
        paidAmount,
        remainingAmount,
        viewStatus,
      }
    })
  }, [notes, today])

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase()

    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.viewStatus !== statusFilter) {
        return false
      }

      if (!term) {
        return true
      }

      return [
        row.customer?.name,
        row.sale_id,
        row.notes,
        row.installments_count,
        row.total_amount,
        row.nextInstallment?.due_date,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [query, rows, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage))
  const currentPage = Math.min(page, totalPages)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredRows.slice(start, start + itemsPerPage)
  }, [currentPage, filteredRows])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter])

  const stats = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.totalAmount += row.remainingAmount
        if (row.viewStatus === 'overdue') {
          accumulator.overdueAmount += row.overdueAmount
          accumulator.overdueCount += 1
        }
        if (row.viewStatus === 'open') {
          accumulator.openCount += 1
        }
        if (row.viewStatus === 'paid') {
          accumulator.paidCount += 1
        }
        return accumulator
      },
      { totalAmount: 0, overdueAmount: 0, openCount: 0, overdueCount: 0, paidCount: 0 },
    )
  }, [rows])

  const noteColumns = [
    {
      key: 'customer',
      header: 'Cliente',
      render: (row: PromissoryRow) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-950">{row.customer?.name ?? 'Cliente não informado'}</p>
          <p className="text-xs text-gray-500">{row.sale_id.slice(0, 8).toUpperCase()}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Total',
      render: (row: PromissoryRow) => (
        <div>
          <p className="font-medium text-gray-950">{formatCurrencyBRL(row.total_amount)}</p>
          <p className="text-xs text-gray-500">Em aberto: {formatCurrencyBRL(row.remainingAmount)}</p>
        </div>
      ),
    },
    {
      key: 'installments',
      header: 'Parcelas',
      render: (row: PromissoryRow) => (
        <div>
          <p className="font-medium text-gray-950">{row.installments_count} previstas</p>
          <p className="text-xs text-gray-500">
            {row.nextInstallment
              ? `Próx. ${row.nextInstallment.installment_number} em ${formatDateBR(row.nextInstallment.due_date)}`
              : 'Sem parcelas pendentes'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: PromissoryRow) => statusBadge(row.viewStatus),
    },
    {
      key: 'actions',
      header: 'Ações',
      render: (row: PromissoryRow) => (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSelectedNote(row)}>
            Detalhes
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const next = row.nextInstallment
              if (!next) {
                setSelectedNote(row)
                return
              }

              openPaymentDraft(row, next)
            }}
            disabled={!cashSessionOpen || !row.nextInstallment}
          >
            Receber parcela
          </Button>
        </div>
      ),
    },
  ]

  function openPaymentDraft(note: PromissoryNote, installment: PromissoryInstallment) {
    setPaymentDraft({
      note,
      installment,
      paymentMethod: 'dinheiro',
      movementDate: today,
      notes: '',
    })
  }

  async function handlePinConfirm(pin: string) {
    if (!paymentDraft || !cashSessionId) {
      setError('Abra o caixa antes de receber uma parcela.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await registerPromissoryInstallmentPayment({
        promissoryInstallmentId: paymentDraft.installment.id,
        paymentMethod: paymentDraft.paymentMethod,
        movementDate: paymentDraft.movementDate,
        notes: paymentDraft.notes,
        user,
        cashSessionId,
        confirmationPin: pin,
      })

      const updatedNotes = await listPromissoryNotes()
      setNotes(updatedNotes)
      setSelectedNote(null)
      setPaymentDraft(null)
      setPinModalOpen(false)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card
        title="Promissórias"
        description="Acompanhe vendas em crediário, confira vencimentos e receba parcelas quando o cliente pagar."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/caixa')}>
              <Wallet className="h-4 w-4" />
              Ir para Caixa
            </Button>
          </div>
        }
      >
        {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Em aberto" value={String(stats.openCount)} />
          <StatCard label="Vencidas" value={String(stats.overdueCount)} accent="warning" />
          <StatCard label="Quitadas" value={String(stats.paidCount)} accent="success" />
          <StatCard label="Saldo em aberto" value={formatCurrencyBRL(stats.totalAmount)} />
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-600" />
            <Input className="pl-9" placeholder="Pesquisar por cliente, venda ou observação" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            {statusFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === option.value
                    ? 'border-gray-950 bg-gray-950 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-950'
                }`}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Carregando promissórias...</div>
          ) : filteredRows.length === 0 ? (
            <EmptyState
              title="Nenhuma promissória encontrada."
              description="Ajuste os filtros ou registre uma nova venda em promissória."
            />
          ) : (
            <>
              <Table
                data={paginatedRows}
                emptyMessage="Nenhuma promissória encontrada."
                columns={noteColumns}
              />
              <div className="flex flex-col gap-3 border-t border-gray-200 px-1 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-gray-500">
                  Exibindo {Math.min(filteredRows.length, (currentPage - 1) * itemsPerPage + 1)}-
                  {Math.min(currentPage * itemsPerPage, filteredRows.length)} de {filteredRows.length} registros
                </span>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={(nextPage) => setPage(nextPage)} />
              </div>
            </>
          )}
        </div>
      </Card>

      <Modal
        open={selectedNote !== null}
        title="Detalhes da promissória"
        onClose={() => setSelectedNote(null)}
        size="5xl"
        bodyClassName="p-0"
      >
        {selectedNote ? (
          <PromissoryDetailContent
            note={selectedNote}
            cashSessionOpen={cashSessionOpen}
            onReceive={(installment) => openPaymentDraft(selectedNote, installment)}
          />
        ) : null}
      </Modal>

      <Modal
        open={paymentDraft !== null}
        title="Receber parcela"
        onClose={() => setPaymentDraft(null)}
        size="lg"
      >
        {paymentDraft ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Cliente</p>
              <p className="mt-1 text-sm font-semibold text-gray-950">{paymentDraft.note.customer?.name ?? 'Cliente'}</p>
              <p className="text-sm text-gray-600">
                Parcela {paymentDraft.installment.installment_number} de {formatCurrencyBRL(paymentDraft.installment.amount)}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">Forma de recebimento</span>
                <select
                  className="h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                  value={paymentDraft.paymentMethod}
                  onChange={(event) =>
                    setPaymentDraft((current) =>
                      current ? { ...current, paymentMethod: event.target.value as PaymentDraft['paymentMethod'] } : current,
                    )
                  }
                >
                  {paymentMethodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Input
                label="Data do recebimento"
                type="date"
                value={paymentDraft.movementDate}
                onChange={(event) =>
                  setPaymentDraft((current) => (current ? { ...current, movementDate: event.target.value } : current))
                }
              />
            </div>

            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">Observação</span>
              <textarea
                className="min-h-24 w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                value={paymentDraft.notes}
                onChange={(event) =>
                  setPaymentDraft((current) => (current ? { ...current, notes: event.target.value } : current))
                }
              />
            </label>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setPaymentDraft(null)}>
                Cancelar
              </Button>
              <Button onClick={() => setPinModalOpen(true)} disabled={!cashSessionOpen}>
                Confirmar com PIN
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <PinConfirmationModal
        open={pinModalOpen}
        title="Confirmar recebimento"
        description="Digite seu PIN para concluir a baixa da parcela no caixa."
        confirmLabel="Confirmar recebimento"
        submitting={submitting}
        error={error}
        onClose={() => {
          if (submitting) {
            return
          }
          setPinModalOpen(false)
        }}
        onConfirm={handlePinConfirm}
      />
    </div>
  )
}

function PromissoryDetailContent({
  note,
  cashSessionOpen,
  onReceive,
}: {
  note: PromissoryNote
  cashSessionOpen: boolean
  onReceive: (installment: PromissoryInstallment) => void
}) {
  const installments = (note.installments ?? []).slice().sort((a, b) => a.installment_number - b.installment_number)
  const paidAmount = installments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
  const remainingAmount = Math.max(0, note.total_amount - paidAmount)

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="grid gap-3 md:grid-cols-3">
        <DetailCard label="Cliente" value={note.customer?.name ?? '-'} />
        <DetailCard label="Total" value={formatCurrencyBRL(note.total_amount)} />
        <DetailCard label="Saldo" value={formatCurrencyBRL(remainingAmount)} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DetailCard label="Parcelas" value={String(note.installments_count)} />
        <DetailCard label="Primeiro vencimento" value={formatDateBR(note.first_due_date)} />
        <DetailCard label="Intervalo" value={`${note.interval_days} dias`} />
      </div>

      <Table
        data={installments.map((installment) => ({
          ...installment,
          id: installment.id,
        }))}
        emptyMessage="Nenhuma parcela cadastrada."
        columns={[
          { key: 'number', header: 'Parcela', render: (row) => `${row.installment_number}ª` },
          { key: 'due', header: 'Vencimento', render: (row) => formatDateBR(row.due_date) },
          { key: 'amount', header: 'Valor', render: (row) => formatCurrencyBRL(row.amount) },
          {
            key: 'status',
            header: 'Status',
            render: (row) =>
              row.status === 'paid' ? (
                <Badge variant="success">Paga</Badge>
              ) : row.due_date < todayISODate() ? (
                <Badge variant="warning">Vencida</Badge>
              ) : (
                <Badge variant="neutral">Pendente</Badge>
              ),
          },
          {
            key: 'method',
            header: 'Recebimento',
            render: (row) => formatPaymentMethodLabel(row.payment_method, 1),
          },
          {
            key: 'action',
            header: 'Ação',
            render: (row) =>
              row.status === 'pending' ? (
                <Button size="sm" disabled={!cashSessionOpen} onClick={() => onReceive(row)}>
                  Receber
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Quitada
                </div>
              ),
          },
        ]}
      />
    </div>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-950">{value}</p>
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = 'default',
}: {
  label: string
  value: string
  accent?: 'default' | 'success' | 'warning'
}) {
  const className =
    accent === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : accent === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-gray-200 bg-gray-50 text-gray-700'

  return (
    <div className={`rounded-2xl border-2 p-4 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-950">{value}</p>
    </div>
  )
}

function statusBadge(status: PromissoryViewStatus) {
  if (status === 'paid') {
    return <Badge variant="success">Quitada</Badge>
  }

  if (status === 'overdue') {
    return <Badge variant="warning">Vencida</Badge>
  }

  if (status === 'cancelled') {
    return <Badge variant="neutral">Cancelada</Badge>
  }

  return <Badge variant="neutral">Em aberto</Badge>
}
