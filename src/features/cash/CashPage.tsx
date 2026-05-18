import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { formatCurrency } from '../../lib/utils'
import type { CashMovement } from '../../types/database'
import { CashMovementForm } from './CashMovementForm'

const movements: CashMovement[] = [
  {
    id: '1',
    type: 'entrada',
    description: 'Venda #1024',
    amount: 238.9,
    movement_date: '2026-05-18',
    payment_method: 'pix',
    notes: null,
    created_at: '',
  },
  {
    id: '2',
    type: 'saida',
    description: 'Pagamento fornecedor',
    amount: 180,
    movement_date: '2026-05-18',
    payment_method: 'dinheiro',
    notes: 'Reposição',
    created_at: '',
  },
]

export function CashPage() {
  const balance = movements.reduce(
    (sum, movement) => sum + (movement.type === 'entrada' ? movement.amount : -movement.amount),
    0,
  )

  return (
    <div className="space-y-6">
      <Card title="Fluxo de caixa" description="Registre entradas, saídas e formas de pagamento.">
        <CashMovementForm onSubmit={() => undefined} />
      </Card>

      <Card
        title="Movimentações financeiras"
        action={<p className="text-sm font-semibold text-gray-950">Saldo: {formatCurrency(balance)}</p>}
      >
        <Table
          data={movements}
          columns={[
            { key: 'type', header: 'Tipo', render: (movement) => (movement.type === 'entrada' ? 'Entrada' : 'Saída') },
            { key: 'description', header: 'Descrição', render: (movement) => movement.description },
            { key: 'amount', header: 'Valor', render: (movement) => formatCurrency(movement.amount) },
            { key: 'date', header: 'Data', render: (movement) => movement.movement_date },
            { key: 'payment', header: 'Pagamento', render: (movement) => movement.payment_method.replace('_', ' ') },
          ]}
        />
      </Card>
    </div>
  )
}
