import { Card } from '../../components/ui/Card'
import { SaleForm } from './SaleForm'

export function SalesPage() {
  return (
    <Card title="Venda rápida" description="Busque produtos, monte a venda e finalize com baixa automática no estoque.">
      <SaleForm />
    </Card>
  )
}
