import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Category, Product } from '../../types/database'

export interface ProductFormValues {
  name: string
  brand: string
  reference: string
  barcode: string
  category_id: string
  cost_price: string
  sale_price: string
  suggested_price: string
  stock_quantity: string
  min_stock: string
  size: string
  color: string
  description: string
  active: boolean
}

interface ProductFormProps {
  product?: Product | null
  categories: Category[]
  submitting?: boolean
  onCancel: () => void
  onSubmit: (values: ProductFormValues) => Promise<void> | void
}

const initialValues: ProductFormValues = {
  name: '',
  brand: '',
  reference: '',
  barcode: '',
  category_id: '',
  cost_price: '0',
  sale_price: '',
  suggested_price: '',
  stock_quantity: '0',
  min_stock: '0',
  size: '',
  color: '',
  description: '',
  active: true,
}

export function ProductForm({
  product,
  categories,
  submitting = false,
  onCancel,
  onSubmit,
}: ProductFormProps) {
  const [values, setValues] = useState<ProductFormValues>(() =>
    product
      ? {
          name: product.name,
          brand: product.brand ?? '',
          reference: product.reference ?? '',
          barcode: product.barcode ?? '',
          category_id: product.category_id ?? '',
          cost_price: String(product.cost_price ?? 0),
          sale_price: String(product.sale_price ?? ''),
          suggested_price:
            product.suggested_price === null || product.suggested_price === undefined
              ? ''
              : String(product.suggested_price),
          stock_quantity: String(product.stock_quantity ?? 0),
          min_stock: String(product.min_stock ?? 0),
          size: product.size ?? '',
          color: product.color ?? '',
          description: product.description ?? '',
          active: product.active,
        }
      : initialValues,
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Partial<Record<keyof ProductFormValues, string>> = {}
    if (!values.name.trim()) {
      nextErrors.name = 'Informe o nome do produto.'
    }
    if (!values.category_id) {
      nextErrors.category_id = 'Selecione uma categoria.'
    }
    if (!values.sale_price || Number(values.sale_price) <= 0) {
      nextErrors.sale_price = 'Informe um preço de venda válido.'
    }
    if (values.stock_quantity === '' || Number(values.stock_quantity) < 0) {
      nextErrors.stock_quantity = 'Informe uma quantidade válida.'
    }
    if (values.min_stock === '' || Number(values.min_stock) < 0) {
      nextErrors.min_stock = 'Informe um estoque mínimo válido.'
    }
    if (values.cost_price !== '' && Number(values.cost_price) < 0) {
      nextErrors.cost_price = 'Informe um preço de custo válido.'
    }
    if (values.suggested_price !== '' && Number(values.suggested_price) < 0) {
      nextErrors.suggested_price = 'Informe um preço sugerido válido.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit(values)
  }

  function updateValue<Key extends keyof ProductFormValues>(key: Key, value: ProductFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Nome do produto"
          name="name"
          value={values.name}
          onChange={(event) => updateValue('name', event.target.value)}
          error={errors.name}
          required
        />
        <Input
          label="Marca"
          name="brand"
          value={values.brand}
          onChange={(event) => updateValue('brand', event.target.value)}
        />
        <Input
          label="Referência"
          name="reference"
          value={values.reference}
          onChange={(event) => updateValue('reference', event.target.value)}
        />
        <Input
          label="Código de barras"
          name="barcode"
          inputMode="text"
          value={values.barcode}
          onChange={(event) => updateValue('barcode', event.target.value)}
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gray-700">Categoria</span>
          <select
            name="category_id"
            value={values.category_id}
            onChange={(event) => updateValue('category_id', event.target.value)}
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            required
          >
            <option value="">Selecione</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.category_id ? <span className="text-xs text-red-600">{errors.category_id}</span> : null}
        </label>
        <Input
          label="Preço de custo"
          name="cost_price"
          type="number"
          min="0"
          step="0.01"
          value={values.cost_price}
          onChange={(event) => updateValue('cost_price', event.target.value)}
          error={errors.cost_price}
        />
        <Input
          label="Preço de venda"
          name="sale_price"
          type="number"
          min="0"
          step="0.01"
          value={values.sale_price}
          onChange={(event) => updateValue('sale_price', event.target.value)}
          error={errors.sale_price}
          required
        />
        <Input
          label="Preço sugerido"
          name="suggested_price"
          type="number"
          min="0"
          step="0.01"
          value={values.suggested_price}
          onChange={(event) => updateValue('suggested_price', event.target.value)}
          error={errors.suggested_price}
        />
        <Input
          label="Quantidade inicial em estoque"
          name="stock"
          type="number"
          min="0"
          value={values.stock_quantity}
          onChange={(event) => updateValue('stock_quantity', event.target.value)}
          error={errors.stock_quantity}
          required
        />
        <Input
          label="Estoque mínimo"
          name="min_stock"
          type="number"
          min="0"
          value={values.min_stock}
          onChange={(event) => updateValue('min_stock', event.target.value)}
          error={errors.min_stock}
          required
        />
        <Input
          label="Tamanho"
          name="size"
          value={values.size}
          onChange={(event) => updateValue('size', event.target.value)}
        />
        <Input
          label="Cor"
          name="color"
          value={values.color}
          onChange={(event) => updateValue('color', event.target.value)}
        />
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Descrição</span>
        <textarea
          name="description"
          rows={3}
          value={values.description}
          onChange={(event) => updateValue('description', event.target.value)}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(event) => updateValue('active', event.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Produto ativo
      </label>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar produto'}
        </Button>
      </div>
    </form>
  )
}
