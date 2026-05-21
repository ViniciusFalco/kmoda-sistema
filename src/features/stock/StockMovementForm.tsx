import { useEffect, useState, type FormEvent } from 'react'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import type { Product, StockMovementReason, StockMovementType } from '../../types/database'

export interface StockMovementFormValues {
  product_id: string
  type: StockMovementType
  reason: StockMovementReason
  quantity: string
  notes: string
}

interface StockMovementFormProps {
  products: Product[]
  submitting?: boolean
  defaultType?: StockMovementType
  defaultReason?: StockMovementReason
  initialProductId?: string
  onBarcodeScan?: (code: string) => Promise<void> | void
  onSubmit: (values: StockMovementFormValues) => Promise<void> | void
}

export function StockMovementForm({
  products,
  submitting = false,
  defaultType = 'entrada',
  defaultReason = 'compra',
  initialProductId = '',
  onBarcodeScan,
  onSubmit,
}: StockMovementFormProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await onSubmit({
      product_id: String(form.get('product_id') ?? ''),
      type: String(form.get('type') ?? 'entrada') as StockMovementType,
      reason: String(form.get('reason') ?? 'compra') as StockMovementReason,
      quantity: String(form.get('quantity') ?? '1'),
      notes: String(form.get('notes') ?? ''),
    })
    event.currentTarget.reset()
  }

  return (
    <form className="grid gap-4 xl:grid-cols-[2fr_140px_170px_120px_1fr_auto]" onSubmit={handleSubmit}>
      <ProductField products={products} initialProductId={initialProductId} onBarcodeScan={onBarcodeScan} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Tipo</span>
        <select
          name="type"
          defaultValue={defaultType}
          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-gray-700">Motivo</span>
        <select
          name="reason"
          defaultValue={defaultReason}
          className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="cadastro_inicial">Cadastro inicial</option>
          <option value="compra">Compra</option>
          <option value="ajuste_manual">Ajuste manual</option>
          <option value="troca">Troca</option>
          <option value="perda">Perda</option>
        </select>
      </label>
      <Input label="Quantidade" name="quantity" type="number" min="1" defaultValue="1" required />
      <Input label="Observação" name="notes" />
      <div className="flex items-end">
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Registrar'}
        </Button>
      </div>
    </form>
  )
}

function ProductField({
  products,
  initialProductId,
  onBarcodeScan,
}: {
  products: Product[]
  initialProductId: string
  onBarcodeScan?: (code: string) => Promise<void> | void
}) {
  const [value, setValue] = useState('')
  const options = products.map((product) => ({
    value: product.id,
    label: product.product_model?.name ?? product.name,
    meta: [
      product.product_model?.reference,
      product.barcode,
      product.product_model?.family,
      product.product_model?.brand?.name ?? product.brand?.name,
      product.product_model?.category?.name ?? product.clothing_type?.name,
      product.size?.name,
      product.color?.name,
    ]
      .filter(Boolean)
      .join(' • '),
  }))

  useEffect(() => {
    setValue(initialProductId)
  }, [initialProductId])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">Produto</span>
        {onBarcodeScan ? (
          <BarcodeScanButton
            label="Ler código"
            variant="secondary"
            onScan={onBarcodeScan}
            className="h-9"
          />
        ) : null}
      </div>
      <input type="hidden" name="product_id" value={value} required />
      <SearchableSelect
        label=""
        placeholder="Buscar por nome ou código de barras"
        value={value}
        options={options}
        onChange={setValue}
      />
    </div>
  )
}
