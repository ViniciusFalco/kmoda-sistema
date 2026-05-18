import { Card } from '../../components/ui/Card'
import { SaleForm } from './SaleForm'

export function SalesPage() {
  return (
    <Card title="Registrar venda" description="Busque produtos por nome ou código de barras e finalize a venda.">
      <SaleForm />
    </Card>
  )
}
