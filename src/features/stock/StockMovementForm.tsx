import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { listProducts } from '../../lib/catalog'
import type { Product } from '../../types/database'

interface StockMovementFormProps {
  onSubmit: () => void
}

export function StockMovementForm({ onSubmit }: StockMovementFormProps) {
  const [productQuery, setProductQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])

  useEffect(() => {
    let active = true

    async function searchProducts() {
      if (productQuery.trim().length < 2) {
        return
      }

      try {
        const products = await listProducts({ query: productQuery })
        if (active) {
          setSuggestions(products.slice(0, 8))
        }
      } catch {
        if (active) {
          setSuggestions([])
        }
      }
    }

    void searchProducts()

    return () => {
      active = false
    }
  }, [productQuery])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="grid gap-4 lg:grid-cols-5" onSubmit={handleSubmit}>
      <div>
        <Input
          label="Produto"
          name="product"
          placeholder="Nome, referência ou código de barras"
          list="stock-product-options"
          value={productQuery}
          onChange={(event) => {
            setProductQuery(event.target.value)
            if (event.target.value.trim().length < 2) {
              setSuggestions([])
            }
          }}
          required
        />
        <datalist id="stock-product-options">
          {suggestions.map((product) => (
            <option
              key={product.id}
              value={product.barcode ?? product.reference ?? product.name}
            >{`${product.name}${product.reference ? ` - ${product.reference}` : ''}`}</option>
          ))}
        </datalist>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Tipo</span>
        <select name="type" className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Motivo</span>
        <select name="reason" className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm">
          <option value="cadastro_inicial">Cadastro inicial</option>
          <option value="compra">Compra</option>
          <option value="venda">Venda</option>
          <option value="ajuste_manual">Ajuste manual</option>
          <option value="troca">Troca</option>
          <option value="perda">Perda</option>
        </select>
      </label>
      <Input label="Quantidade" name="quantity" type="number" min="1" defaultValue="1" required />
      <div className="flex items-end">
        <Button type="submit" className="w-full">
          Registrar
        </Button>
      </div>
    </form>
  )
}
