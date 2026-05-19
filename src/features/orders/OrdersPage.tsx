import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { Table } from '../../components/ui/Table'
import { formatCurrency } from '../../lib/utils'
import { OrderForm } from './OrderForm'

const orders = [
  {
    id: '1',
    customer: 'Marina Costa',
    product: 'Vestido midi floral tamanho M',
    amount: 159.9,
    expectedDate: '2026-05-20',
    status: 'pendente',
    notes: 'Cliente pediu aviso pelo WhatsApp.',
  },
  {
    id: '2',
    customer: 'Camila Rocha',
    product: 'Blusa canelada preta',
    amount: 79.9,
    expectedDate: '2026-05-21',
    status: 'em_separacao',
    notes: 'Separar até o fim do dia.',
  },
]

export function OrdersPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <Card
      title="Encomendas"
      description="Acompanhe pedidos combinados com clientes. Estrutura visual preparada para Supabase."
      action={
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova encomenda
        </Button>
      }
    >
      <Table
        data={orders}
        columns={[
          { key: 'customer', header: 'Cliente', render: (order) => order.customer },
          { key: 'product', header: 'Produto/descrição', render: (order) => order.product },
          { key: 'amount', header: 'Valor', render: (order) => formatCurrency(order.amount) },
          { key: 'expectedDate', header: 'Data prevista', render: (order) => order.expectedDate },
          { key: 'status', header: 'Status', render: (order) => <StatusBadge status={order.status} /> },
          { key: 'notes', header: 'Observações', render: (order) => order.notes },
        ]}
      />

      <Modal open={modalOpen} title="Nova encomenda" onClose={() => setModalOpen(false)} size="2xl">
        <OrderForm onCancel={() => setModalOpen(false)} onSubmit={() => setModalOpen(false)} />
      </Modal>
    </Card>
  )
}
