import { Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table } from '../../components/ui/Table'
import { findProductForSale, friendlyCatalogError } from '../../lib/catalog'
import { formatCurrency } from '../../lib/utils'

interface SaleLine {
  id: string
  name: string
  reference?: string | null
  barcode: string
  quantity: number
  unitPrice: number
}

export function SaleForm() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<SaleLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  )

  async function addProduct() {
    if (!query.trim()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const product = await findProductForSale(query)

      if (!product) {
        setError('Produto não encontrado para o termo informado.')
        return
      }

      setItems((current) => {
        const existing = current.find((item) => item.id === product.id)
        if (existing) {
          return current.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          )
        }

        return [
          ...current,
          {
            id: product.id,
            name: product.name,
            reference: product.reference,
            barcode: product.barcode ?? '',
            quantity: 1,
            unitPrice: product.sale_price,
          },
        ]
      })
      setQuery('')
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }

  function removeProduct(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  function finishSale() {
    console.info('Preparado para salvar venda, itens e baixa de estoque no Supabase.', items)
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, referência ou código de barras"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void addProduct()
              }
            }}
          />
        </div>
        <Button onClick={() => void addProduct()} disabled={loading}>
          {loading ? 'Buscando...' : 'Adicionar item'}
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <Table
        data={items}
        emptyMessage="Nenhum item adicionado."
        columns={[
          { key: 'name', header: 'Produto', render: (item) => item.name },
          { key: 'reference', header: 'Ref.', render: (item) => item.reference ?? '-' },
          { key: 'barcode', header: 'Código', render: (item) => item.barcode },
          { key: 'quantity', header: 'Qtd.', render: (item) => item.quantity },
          { key: 'unit', header: 'Unitário', render: (item) => formatCurrency(item.unitPrice) },
          { key: 'total', header: 'Total', render: (item) => formatCurrency(item.quantity * item.unitPrice) },
          {
            key: 'remove',
            header: '',
            render: (item) => (
              <Button variant="ghost" size="sm" onClick={() => removeProduct(item.id)} aria-label="Remover item">
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          },
        ]}
      />

      <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_220px_180px] md:items-end">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Forma de pagamento</span>
          <select className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm">
            <option>Dinheiro</option>
            <option>Pix</option>
            <option>Cartão de crédito</option>
            <option>Cartão de débito</option>
          </select>
        </label>
        <div>
          <p className="text-sm text-gray-500">Total da venda</p>
          <p className="text-2xl font-semibold text-gray-950">{formatCurrency(total)}</p>
        </div>
        <Button onClick={finishSale} disabled={items.length === 0}>
          Finalizar venda
        </Button>
      </div>
    </div>
  )
}
