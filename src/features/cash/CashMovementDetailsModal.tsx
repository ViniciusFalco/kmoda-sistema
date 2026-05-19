import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import { formatCurrencyBRL, formatDateBR } from '../../lib/utils'
import type { CashMovement } from '../../types/database'
import type { ReactNode } from 'react'

interface CashMovementDetailsModalProps {
  movement: CashMovement | null
  onClose: () => void
}

export function CashMovementDetailsModal({ movement, onClose }: CashMovementDetailsModalProps) {
  if (!movement) {
    return null
  }

  const saleItems = movement.sale?.sale_items ?? []
  const isIncome = movement.type === 'income'

  return (
    <Modal
      open={Boolean(movement)}
      title={`Lançamento ${movement.movement_code ?? shortCode(movement.id)}`}
      onClose={onClose}
      size="5xl"
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          <Detail label="ID" value={movement.movement_code ?? shortCode(movement.id)} />
          <Detail
            label="Tipo"
            value={<Badge variant={isIncome ? 'success' : 'warning'}>{movementLabel(movement)}</Badge>}
          />
          <Detail label="Origem" value={originLabel(movement.origin)} />
          <Detail label="Descrição" value={movementDescription(movement)} />
          <Detail label="Valor" value={formatCurrencyBRL(movement.amount)} />
          <Detail label="Data" value={formatDateBR(movement.movement_date)} />
          <Detail label="Pagamento" value={paymentLabel(movement.payment_method)} />
          <Detail label="Criado em" value={formatDateBR(movement.created_at)} />
          <Detail label="Atualizado em" value={formatDateBR(movement.updated_at)} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700">Observação</p>
          <p className="mt-1 text-sm text-gray-600">{movement.notes || 'Sem observação.'}</p>
        </div>

        {saleItems.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-950">Produtos da venda</h3>
            <Table
              data={saleItems}
              columns={[
                {
                  key: 'product',
                  header: 'Produto',
                  render: (item) => (
                    <div>
                      <p className="font-medium text-gray-950">{item.product?.name ?? '-'}</p>
                      <p className="text-xs text-gray-500">
                        {[item.product?.barcode, item.product?.brand?.name, item.product?.clothing_type?.name, item.product?.size?.name, item.product?.color?.name]
                          .filter(Boolean)
                          .join(' • ') || '-'}
                      </p>
                    </div>
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
      <p className="text-xs font-medium uppercase text-gray-400">{label}</p>
      <div className="mt-1 text-sm font-medium text-gray-900">{value || '-'}</div>
    </div>
  )
}

function shortCode(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`
}

function originLabel(origin?: string | null) {
  const labels: Record<string, string> = {
    sale: 'Venda',
    manual_expense: 'Gasto manual',
    manual_income: 'Entrada avulsa',
    stock: 'Estoque',
  }

  return origin ? labels[origin] ?? origin : '-'
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
