import { ArrowDownCircle, ArrowUpCircle, Plus, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { Table } from '../../components/ui/Table'
import { formatCurrency } from '../../lib/utils'
import type { CashMovement, CashMovementType } from '../../types/database'
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
  const [movementType, setMovementType] = useState<CashMovementType | null>(null)
  const totals = useMemo(() => {
    const entries = movements
      .filter((movement) => movement.type === 'entrada')
      .reduce((sum, movement) => sum + movement.amount, 0)
    const exits = movements
      .filter((movement) => movement.type === 'saida')
      .reduce((sum, movement) => sum + movement.amount, 0)

    return {
      entries,
      exits,
      balance: entries - exits,
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-950">Caixa</h1>
          <p className="mt-1 text-sm text-gray-500">Registre entradas, saídas e acompanhe o movimento do dia.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMovementType('entrada')} className="h-11 px-5">
            <Plus className="h-4 w-4" />
            Nova entrada
          </Button>
          <Button variant="secondary" onClick={() => setMovementType('saida')} className="h-11 px-5">
            <ArrowDownCircle className="h-4 w-4" />
            Nova saída
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Saldo do dia" value={formatCurrency(totals.balance)} icon={<Wallet className="h-5 w-5" />} />
        <SummaryCard label="Entradas" value={formatCurrency(totals.entries)} icon={<ArrowUpCircle className="h-5 w-5" />} />
        <SummaryCard label="Saídas" value={formatCurrency(totals.exits)} icon={<ArrowDownCircle className="h-5 w-5" />} />
      </div>

      <Card
        title="Histórico do dia"
        description="Movimentações registradas no caixa."
        action={<p className="text-sm font-semibold text-gray-950">Saldo: {formatCurrency(totals.balance)}</p>}
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

      <Modal
        open={movementType !== null}
        title={movementType === 'saida' ? 'Nova saída' : 'Nova entrada'}
        onClose={() => setMovementType(null)}
        size="lg"
      >
        <CashMovementForm
          defaultType={movementType ?? 'entrada'}
          onCancel={() => setMovementType(null)}
          onSubmit={() => setMovementType(null)}
        />
      </Modal>
    </div>
  )
}
