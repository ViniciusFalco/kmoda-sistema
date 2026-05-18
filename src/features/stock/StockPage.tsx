import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import type { StockMovement } from '../../types/database'
import { StockMovementForm } from './StockMovementForm'

const movements: StockMovement[] = [
  {
    id: '1',
    product_id: '1',
    type: 'entrada',
    reason: 'compra',
    quantity: 20,
    notes: 'Reposição semanal',
    created_at: '2026-05-18T09:00:00',
    product: {
      id: '1',
      name: 'Vestido midi floral',
      brand: 'KModa',
      reference: 'VST-001',
      barcode: '7891000000010',
      cost_price: 82,
      sale_price: 159.9,
      suggested_price: 179.9,
      stock_quantity: 12,
      min_stock: 3,
      active: true,
      created_at: '',
      updated_at: '',
    },
  },
  {
    id: '2',
    product_id: '2',
    type: 'saida',
    reason: 'venda',
    quantity: 2,
    notes: null,
    created_at: '2026-05-18T10:20:00',
    product: {
      id: '2',
      name: 'Blusa canelada',
      brand: 'KModa',
      reference: 'BLS-002',
      barcode: '7891000000027',
      cost_price: 35,
      sale_price: 79.9,
      suggested_price: 89.9,
      stock_quantity: 4,
      min_stock: 5,
      active: true,
      created_at: '',
      updated_at: '',
    },
  },
]

export function StockPage() {
  return (
    <div className="space-y-6">
      <Card title="Registrar movimentação" description="Entradas, saídas e ajustes manuais de estoque.">
        <StockMovementForm onSubmit={() => undefined} />
      </Card>

      <Card title="Histórico de movimentações">
        <Table
          data={movements}
          columns={[
            { key: 'product', header: 'Produto', render: (movement) => movement.product?.name ?? '-' },
            { key: 'type', header: 'Tipo', render: (movement) => (movement.type === 'entrada' ? 'Entrada' : 'Saída') },
            { key: 'reason', header: 'Motivo', render: (movement) => movement.reason.replace('_', ' ') },
            { key: 'quantity', header: 'Qtd.', render: (movement) => movement.quantity },
            { key: 'notes', header: 'Observação', render: (movement) => movement.notes ?? '-' },
          ]}
        />
      </Card>
    </div>
  )
}
