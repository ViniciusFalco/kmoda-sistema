import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import type { Customer } from '../../types/database'
import { CustomerForm } from './CustomerForm'

const customers: Customer[] = [
  {
    id: '1',
    name: 'Marina Costa',
    phone: '(11) 99999-0001',
    email: 'marina@email.com',
    cpf: null,
    notes: 'Cliente frequente',
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    name: 'Camila Rocha',
    phone: '(11) 98888-0002',
    email: 'camila@email.com',
    cpf: null,
    notes: null,
    created_at: '',
    updated_at: '',
  },
]

export function CustomersPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <Card
      title="Clientes"
      description="Cadastro básico para vendas e histórico de atendimento."
      action={
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      }
    >
      <Table
        data={customers}
        columns={[
          { key: 'name', header: 'Nome', render: (customer) => customer.name },
          { key: 'phone', header: 'Telefone', render: (customer) => customer.phone ?? '-' },
          { key: 'email', header: 'E-mail', render: (customer) => customer.email ?? '-' },
          { key: 'notes', header: 'Observações', render: (customer) => customer.notes ?? '-' },
        ]}
      />

      <Modal open={modalOpen} title="Novo cliente" onClose={() => setModalOpen(false)}>
        <CustomerForm onCancel={() => setModalOpen(false)} onSubmit={() => setModalOpen(false)} />
      </Modal>
    </Card>
  )
}
