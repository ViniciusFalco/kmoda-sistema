import { Badge } from './Badge'

interface StatusBadgeProps {
  status: string
}

const statusMap: Record<string, { label: string; variant: 'neutral' | 'success' | 'warning' }> = {
  pendente: { label: 'Pendente', variant: 'warning' },
  em_separacao: { label: 'Em separação', variant: 'warning' },
  pronta: { label: 'Pronta', variant: 'success' },
  entregue: { label: 'Entregue', variant: 'success' },
  aberta: { label: 'Aberta', variant: 'warning' },
  finalizada: { label: 'Finalizada', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'neutral' },
  entrada: { label: 'Entrada', variant: 'success' },
  saida: { label: 'Saída', variant: 'warning' },
  income: { label: 'Venda', variant: 'success' },
  expense: { label: 'Gasto', variant: 'warning' },
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, variant: 'neutral' as const }

  return <Badge variant={config.variant}>{config.label}</Badge>
}
