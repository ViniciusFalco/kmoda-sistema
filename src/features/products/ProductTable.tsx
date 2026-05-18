import { Edit, Trash2 } from 'lucide-react'
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
              <p className="font-medium text-gray-950">{product.name}</p>
              <p className="text-xs text-gray-500">{product.barcode ?? 'Sem código'}</p>
            </div>
          ),
        },
        { key: 'brand', header: 'Marca', render: (product) => product.brand ?? '-' },
        { key: 'reference', header: 'Referência', render: (product) => product.reference ?? '-' },
        { key: 'barcode', header: 'Código de barras', render: (product) => product.barcode ?? '-' },
        { key: 'category', header: 'Categoria', render: (product) => product.category?.name ?? '-' },
        { key: 'size', header: 'Tam.', render: (product) => product.size ?? '-' },
        { key: 'color', header: 'Cor', render: (product) => product.color ?? '-' },
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
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
              {product.active ? 'Ativo' : 'Inativo'}
            </span>
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
