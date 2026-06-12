import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { formatCurrencyBRL, formatDateBR } from '../../lib/utils'
import { formatSalePaymentSummary, formatUserRoleLabel, getSaleConditionTotals } from '../../lib/catalog'
import type { CashHistoryEntry, CashMovement } from '../../types/database'
import type { ReactNode } from 'react'

interface CashMovementDetailsModalProps {
  entry: CashHistoryEntry | null
  onClose: () => void
}

export function CashMovementDetailsModal({ entry, onClose }: CashMovementDetailsModalProps) {
  if (!entry) {
    return null
  }

  const isSession = entry.kind === 'session'
  const movement = isSession ? null : entry
  const saleItems = movement?.sale?.sale_items ?? []
  const sale = movement?.sale ?? null
  const saleTotals = getSaleConditionTotals(sale)
  const paymentSummary = formatSalePaymentSummary(sale)
  const isIncome = movement?.type === 'income'

  return (
    <Modal
      open={Boolean(entry)}
      title={isSession ? (entry.eventType === 'open' ? 'Abertura de caixa' : 'Fechamento de caixa') : `Lançamento ${entry.movement_code ?? shortCode(entry.id)}`}
      onClose={onClose}
      size="5xl"
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Detail label="ID" value={entry.movement_code ?? shortCode(entry.id)} />
          <Detail
            label="Tipo"
            value={
              isSession ? (
                <Badge variant="neutral">{entry.eventType === 'open' ? 'Abertura' : 'Fechamento'}</Badge>
              ) : (
                <Badge variant={isIncome ? 'success' : 'warning'}>{movementLabel(movement)}</Badge>
              )
            }
          />
          <Detail label="Origem" value={isSession ? (entry.eventType === 'open' ? 'Abertura de caixa' : 'Fechamento de caixa') : originLabel(movement?.origin)} />
          <Detail label="Descrição" value={isSession ? entry.description : movementDescription(movement)} />
          <Detail label="Valor" value={formatCurrencyBRL(entry.amount)} />
          <Detail label="Data" value={formatDateBR(entry.movement_date)} />
          <Detail label="Cliente" value={isSession ? '-' : sale?.customer?.name ?? '-'} />
          <Detail label="À vista" value={isSession ? '-' : formatCurrencyBRL(saleTotals.cashSubtotal)} />
          <Detail label="Parcelado" value={isSession ? '-' : formatCurrencyBRL(saleTotals.installmentSubtotal)} />
          <Detail label="Recebimentos" value={isSession ? '-' : paymentSummary} />
          <Detail
            label="Operador"
            value={isSession ? '-' : movement?.created_by_name ?? movement?.sale?.created_by_name ?? movement?.sale?.created_by_user_id ?? movement?.user_id ?? '-'}
          />
          <Detail
            label="Perfil"
            value={isSession ? '-' : formatUserRoleLabel(movement?.created_by_role ?? movement?.sale?.created_by_role)}
          />
          <Detail
            label="PIN confirmado em"
            value={
              isSession
                ? '-'
                : formatDateBR(movement?.confirmed_with_pin_at ?? movement?.sale?.confirmed_with_pin_at ?? movement?.created_at)
            }
          />
          <Detail label="Criado em" value={formatDateBR(entry.created_at)} />
          <Detail
            label="Atualizado em"
            value={isSession ? formatDateBR(entry.updated_at ?? entry.created_at) : formatDateBR(movement?.updated_at)}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">Observação</p>
          <p className="mt-1 text-sm text-gray-600">{isSession ? entry.notes || 'Sem observação.' : movement?.notes || 'Sem observação.'}</p>
        </div>

        {saleItems.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-950">Produtos da venda</h3>
            <Table
              headerClassName="bg-black text-gray-100"
              data={saleItems}
              columns={[
                {
                  key: 'product',
                  header: 'Produto',
                  render: (item) => (
                    <div>
                      <p className="font-medium text-gray-950">{item.product?.product_model?.name ?? item.product?.name ?? '-'}</p>
                      <p className="text-xs text-gray-500">
                        {[
                          item.product?.product_model?.reference,
                          item.product?.barcode,
                          item.product?.product_model?.family,
                          item.product?.product_model?.brand?.name ?? item.product?.brand?.name,
                          item.product?.product_model?.category?.name ?? item.product?.clothing_type?.name,
                          item.product?.size?.name,
                          item.product?.color?.name,
                        ]
                          .filter(Boolean)
                          .join(' • ') || '-'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'condition',
                  header: 'Condição',
                  render: (item) => (
                    <Badge variant={item.pricing_kind === 'installment' ? 'warning' : 'neutral'}>
                      {item.pricing_kind === 'installment'
                        ? `${item.installments_count}x`
                        : 'À vista'}
                    </Badge>
                  ),
                },
                { key: 'quantity', header: 'Qtd.', render: (item) => item.quantity },
                { key: 'unit', header: 'Unitário', render: (item) => formatCurrencyBRL(item.unit_price) },
                { key: 'total', header: 'Total', render: (item) => formatCurrencyBRL(item.total_price) },
              ]}
            />
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-gray-950">{value || '-'}</div>
    </div>
  )
}

function shortCode(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`
}

function originLabel(origin?: string | null) {
  const labels: Record<string, string> = {
    sale: 'Venda',
    manual_expense: 'Despesa manual',
    manual_income: 'Entrada avulsa',
    stock: 'Estoque',
    session_open: 'Abertura de caixa',
    session_close: 'Fechamento de caixa',
  }

  return origin ? labels[origin] ?? origin : '-'
}

function movementLabel(movement: CashMovement | null) {
  if (!movement) {
    return '-'
  }

  if (movement.type === 'expense') {
    return 'Despesa'
  }

  if (movement.origin === 'sale' && movement.sale?.installments_count && movement.sale.installments_count > 1) {
    return `Venda ${movement.sale.installments_count}x`
  }

  return movement.origin === 'sale' ? 'Venda' : 'Entrada avulsa'
}

function movementDescription(movement: CashMovement | null) {
  if (!movement) {
    return '-'
  }

  if (movement.origin !== 'sale') {
    return movement.description
  }

  const productNames = movement.sale?.sale_items
    ?.map((item) => item.product?.product_model?.name ?? item.product?.name)
    .filter(Boolean)

  const installments = movement.sale?.installments_count && movement.sale.installments_count > 1
    ? ` · ${movement.sale.installments_count}x`
    : ''

  return `${productNames?.length ? productNames.join(', ') : movement.description}${installments}`
}
