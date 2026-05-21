import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Table } from '../../components/ui/Table'
import { formatCurrency } from '../../lib/utils'
import type { Product } from '../../types/database'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  return (
    <Table
      data={products}
      columns={[
        {
          key: 'name',
          header: 'Nome',
          render: (product) => (
            <div>
              <p className="font-medium text-gray-950">{product.product_model?.name ?? product.name}</p>
              <p className="text-xs text-gray-500">Família: {product.product_model?.family ?? '-'}</p>
            </div>
          ),
        },
        {
          key: 'reference',
          header: 'Ref.',
          render: (product) => product.product_model?.reference ?? product.reference ?? '-',
        },
        { key: 'barcode', header: 'Código de barras', render: (product) => product.barcode ?? '-' },
        { key: 'brand', header: 'Marca', render: (product) => product.product_model?.brand?.name ?? product.brand?.name ?? '-' },
        {
          key: 'type',
          header: 'Tipo',
          render: (product) => product.product_model?.category?.name ?? product.clothing_type?.name ?? '-',
        },
        { key: 'size', header: 'Tamanho', render: (product) => product.size?.name ?? '-' },
        {
          key: 'color',
          header: 'Cor',
          render: (product) =>
            product.color ? (
              <span className="inline-flex items-center gap-2">
                {product.color.hex ? (
                  <span className="h-3 w-3 rounded-full border border-gray-200" style={{ backgroundColor: product.color.hex }} />
                ) : null}
                {product.color.name}
              </span>
            ) : (
              '-'
            ),
        },
        { key: 'price', header: 'Venda', render: (product) => formatCurrency(product.sale_price) },
        {
          key: 'stock',
          header: 'Estoque',
          render: (product) => (
            <span className={product.stock_quantity <= product.min_stock ? 'font-medium text-amber-700' : undefined}>
              {product.stock_quantity}
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (product) => (
            <Badge variant={product.active ? 'success' : 'neutral'}>{product.active ? 'Ativo' : 'Inativo'}</Badge>
          ),
        },
        {
          key: 'actions',
          header: 'Ações',
          render: (product) => (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" aria-label="Editar produto" onClick={() => onEdit(product)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" aria-label="Excluir produto" onClick={() => onDelete(product)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        },
      ]}
    />
  )
}
