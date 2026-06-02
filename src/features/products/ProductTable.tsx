import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../lib/utils'
import type { Product } from '../../types/database'
import type { KeyboardEvent } from 'react'

interface ProductTableProps {
  products: Product[]
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, product: Product) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onEdit(product)
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1120px] border-collapse text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em]">Produto</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Ref.</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Código de barras</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Marca</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Tipo</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Tamanho</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Cor</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Venda</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Estoque</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Status</th>
            <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {products.map((product) => (
            <tr
              key={product.id}
              className="cursor-pointer transition hover:bg-gray-50/80 focus-within:bg-gray-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300"
              tabIndex={0}
              role="button"
              aria-label={`Editar produto ${product.product_model?.name ?? product.name}`}
              onClick={() => onEdit(product)}
              onKeyDown={(event) => handleRowKeyDown(event, product)}
            >
              <td className="px-4 py-4 text-left text-gray-950">
                <p className="font-medium leading-6">{product.product_model?.name ?? product.name}</p>
              </td>
              <td className="px-4 py-4 text-center text-gray-700">
                {product.product_model?.reference ?? product.reference ?? '-'}
              </td>
              <td className="px-4 py-4 text-center text-gray-700">{product.barcode ?? '-'}</td>
              <td className="px-4 py-4 text-center text-gray-700">
                {product.product_model?.brand?.name ?? product.brand?.name ?? '-'}
              </td>
              <td className="px-4 py-4 text-center text-gray-700">
                {product.product_model?.category?.name ?? product.clothing_type?.name ?? '-'}
              </td>
              <td className="px-4 py-4 text-center text-gray-700">{product.size?.name ?? '-'}</td>
              <td className="px-4 py-4 text-center text-gray-700">
                {product.color ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    {product.color.hex ? (
                      <span
                        className="h-3 w-3 rounded-full border border-gray-200"
                        style={{ backgroundColor: product.color.hex }}
                      />
                    ) : null}
                    {product.color.name}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="px-4 py-4 text-center text-gray-700">{formatCurrency(product.sale_price)}</td>
              <td className="px-4 py-4 text-center text-gray-700">
                <span className={product.stock_quantity <= product.min_stock ? 'font-medium text-amber-700' : undefined}>
                  {product.stock_quantity}
                </span>
              </td>
              <td className="px-4 py-4 text-center">
                <Badge variant={product.active ? 'success' : 'neutral'}>{product.active ? 'Ativo' : 'Inativo'}</Badge>
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Editar produto"
                    onClick={(event) => {
                      event.stopPropagation()
                      onEdit(product)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Excluir produto"
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(product)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
