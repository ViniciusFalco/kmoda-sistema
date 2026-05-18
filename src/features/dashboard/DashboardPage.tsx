import { AlertTriangle, Package, Receipt, Wallet } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import { formatCurrency } from '../../lib/utils'

interface Movement {
  id: string
  date: string
  type: string
  description: string
  amount: number
}

const movements: Movement[] = [
  { id: '1', date: 'Hoje, 09:30', type: 'Venda', description: 'Venda #1024', amount: 238.9 },
  { id: '2', date: 'Hoje, 10:10', type: 'Estoque', description: 'Entrada de camisetas', amount: 0 },
  { id: '3', date: 'Hoje, 11:05', type: 'Caixa', description: 'Pagamento fornecedor', amount: -180 },
]

const stats = [
  { label: 'Total de produtos', value: '128', icon: Package },
  { label: 'Estoque baixo', value: '9', icon: AlertTriangle },
  { label: 'Vendas do dia', value: formatCurrency(1248.7), icon: Receipt },
  { label: 'Saldo do caixa', value: formatCurrency(3820.4), icon: Wallet },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon

          return (
            <Card key={stat.label}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-950">{stat.value}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card title="Últimas movimentações" description="Resumo preparado para receber dados reais do Supabase.">
        <Table
          data={movements}
          columns={[
            { key: 'date', header: 'Data', render: (row) => row.date },
            { key: 'type', header: 'Tipo', render: (row) => row.type },
            { key: 'description', header: 'Descrição', render: (row) => row.description },
            {
              key: 'amount',
              header: 'Valor',
              render: (row) => (row.amount === 0 ? '-' : formatCurrency(row.amount)),
            },
          ]}
        />
      </Card>
    </div>
  )
}
