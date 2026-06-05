import { Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { cn } from '../../lib/utils'
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
  initialProductId?: string
  onBarcodeScan?: (code: string) => Promise<void> | void
  onCancel?: () => void
  onSubmit: (values: StockMovementFormValues) => Promise<void> | void
}

interface ReasonOption {
  value: StockMovementReason
  label: string
}

const reasonOptionsByType: Record<StockMovementType, ReasonOption[]> = {
  entrada: [
    { value: 'compra', label: 'Compra' },
    { value: 'devolucao', label: 'Devolução' },
    { value: 'ajuste_positivo', label: 'Ajuste positivo' },
    { value: 'correcao_estoque', label: 'Correção de estoque' },
  ],
  saida: [
    { value: 'venda_manual', label: 'Venda manual' },
    { value: 'perda', label: 'Perda' },
    { value: 'avaria', label: 'Avaria' },
    { value: 'ajuste_negativo', label: 'Ajuste negativo' },
    { value: 'devolucao_ao_fornecedor', label: 'Devolução ao fornecedor' },
  ],
}

function getProductTitle(product: Product) {
  return product.product_model?.name ?? product.name
}

function getProductMeta(product: Product) {
  return [
    product.product_model?.reference,
    product.barcode,
    product.reference,
    product.product_model?.family,
  ]
    .filter(Boolean)
    .join(' • ')
}

export function StockMovementForm({
  products,
  submitting = false,
  initialProductId = '',
  onBarcodeScan,
  onCancel,
  onSubmit,
}: StockMovementFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [movementType, setMovementType] = useState<StockMovementType>('entrada')
  const [reason, setReason] = useState<StockMovementReason>('compra')
  const [quantity, setQuantity] = useState(1)
  const [observation, setObservation] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const isSubmitting = submitting
  const currentReasonOptions = reasonOptionsByType[movementType]
  const selectedProductStock = selectedProduct?.stock_quantity ?? 0
  const quantityError =
    movementType === 'saida' && selectedProduct && quantity > selectedProductStock
      ? 'Quantidade maior que o estoque disponível.'
      : ''

  const filteredProducts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    if (!normalized) {
      return products.slice(0, 6)
    }

    return products.filter((product) =>
      [
        getProductTitle(product),
        product.barcode,
        product.reference,
        product.product_model?.reference,
        product.product_model?.family,
        product.product_model?.brand?.name ?? product.brand?.name,
        product.product_model?.category?.name ?? product.clothing_type?.name,
        product.size?.name,
        product.color?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    )
  }, [products, searchTerm])

  const canSubmit =
    Boolean(selectedProduct) &&
    Boolean(movementType) &&
    Boolean(reason) &&
    quantity > 0 &&
    !quantityError &&
    !isSubmitting

  useEffect(() => {
    const nextReason = currentReasonOptions[0]?.value ?? 'compra'
    setReason(nextReason)
  }, [currentReasonOptions, movementType])

  useEffect(() => {
    if (!initialProductId) {
      return
    }

    const product = products.find((item) => item.id === initialProductId) ?? null
    setSelectedProduct(product)
    setSearchTerm(product ? getProductTitle(product) : '')
  }, [initialProductId, products])

  function selectProduct(product: Product) {
    setSelectedProduct(product)
    setSearchTerm(getProductTitle(product))
    setSearchFocused(false)
  }

  function resetForm() {
    setSelectedProduct(null)
    setMovementType('entrada')
    setReason('compra')
    setQuantity(1)
    setObservation('')
    setSearchTerm('')
    setSearchFocused(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProduct || !movementType || !reason || quantity <= 0) {
      return
    }

    if (quantityError) {
      return
    }

    await Promise.resolve(
      onSubmit({
        product_id: selectedProduct.id,
        type: movementType,
        reason,
        quantity: String(quantity),
        notes: observation,
      }),
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <style>{`
        .stock-qty-input::-webkit-inner-spin-button,
        .stock-qty-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .stock-qty-input {
          -moz-appearance: textfield;
        }
      `}</style>

      <section className="space-y-3">
        <div className="flex items-center justify-center gap-3">
          <span className="text-center text-sm font-medium text-gray-600">Produto</span>
          {onBarcodeScan ? (
            <BarcodeScanButton
              label="Ler código"
              variant="secondary"
              onScan={onBarcodeScan}
              className="h-10 shrink-0"
            />
          ) : null}
        </div>

        <div className="relative">
          <Input
            className="h-12"
            placeholder="Buscar por nome, código ou referência"
            value={searchTerm}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setSearchFocused(false), 120)
            }}
            onChange={(event) => {
              const value = event.target.value
              setSearchTerm(value)
              setSearchFocused(true)

              if (selectedProduct) {
                setSelectedProduct(null)
              }
            }}
          />

          {searchFocused && !selectedProduct ? (
            <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
              {filteredProducts.length === 0 ? (
                <div className="px-4 py-4 text-sm text-gray-500">Nenhum produto encontrado.</div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className={cn(
                      'flex w-full flex-col gap-1 rounded-lg px-4 py-3 text-left transition',
                      'hover:bg-gray-50 focus:bg-gray-50',
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectProduct(product)}
                  >
                    <span className="text-sm font-semibold text-gray-950">{getProductTitle(product)}</span>
                    <span className="text-xs text-gray-500">{getProductMeta(product) || 'Sem referência'}</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </section>

      {selectedProduct ? (
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-950 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-gray-950">{getProductTitle(selectedProduct)}</h3>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryChip label="Marca" value={selectedProduct.product_model?.brand?.name ?? selectedProduct.brand?.name ?? '-'} />
            <SummaryChip label="Tamanho" value={selectedProduct.size?.name ?? '-'} />
            <SummaryChip label="Cor" value={selectedProduct.color?.name ?? '-'} />
            <SummaryChip label="Estoque atual" value={String(selectedProduct.stock_quantity)} strong />
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
          Selecione um produto para continuar.
        </section>
      )}

      <section className="space-y-3">
        <span className="block text-center text-sm font-medium text-gray-600">Movimentação</span>
        <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-3 text-sm font-semibold transition',
              movementType === 'entrada'
                ? 'bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
                : 'text-gray-600 hover:bg-white hover:text-gray-950',
            )}
            onClick={() => setMovementType('entrada')}
          >
            Entrada
          </button>
          <button
            type="button"
            className={cn(
              'rounded-lg px-4 py-3 text-sm font-semibold transition',
              movementType === 'saida'
                ? 'bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
                : 'text-gray-600 hover:bg-white hover:text-gray-950',
            )}
            onClick={() => setMovementType('saida')}
          >
            Saída
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <label className="block space-y-1.5">
          <span className="block text-center text-sm font-medium text-gray-600">Motivo</span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as StockMovementReason)}
            className="h-12 w-full rounded-md border-2 border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          >
            {currentReasonOptions.map((option) => (
              <option key={option.value} value={option.value} className="text-gray-950">
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <span className="block text-center text-sm font-medium text-gray-600">Quantidade</span>
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-12 w-12 rounded-md px-0"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            disabled={quantity <= 1}
            aria-label="Diminuir quantidade"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => {
              const nextValue = Number(event.target.value)
              if (!Number.isFinite(nextValue) || nextValue < 1) {
                setQuantity(1)
                return
              }

              setQuantity(Math.floor(nextValue))
            }}
            className="stock-qty-input h-12 text-center text-lg font-semibold tracking-[-0.02em]"
          />

          <Button
            type="button"
            variant="secondary"
            className="h-12 w-12 rounded-md px-0"
            onClick={() => {
              setQuantity((current) => {
                if (movementType === 'saida' && selectedProduct) {
                  return Math.min(selectedProductStock, current + 1)
                }

                return current + 1
              })
            }}
            disabled={
              movementType === 'saida' && Boolean(selectedProduct) ? quantity >= selectedProductStock : false
            }
            aria-label="Aumentar quantidade"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {quantityError ? <p className="text-sm text-rose-600">{quantityError}</p> : null}
      </section>

      <section className="space-y-3">
        <label className="block space-y-1.5">
          <span className="block text-center text-sm font-medium text-gray-600">Observação</span>
          <textarea
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            rows={3}
            placeholder="Opcional"
            className="min-h-[88px] w-full rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          />
        </label>
      </section>

      <footer className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            resetForm()
            onCancel?.()
          }}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {isSubmitting ? (
            'Salvando...'
          ) : movementType === 'entrada' ? (
            'Confirmar entrada'
          ) : (
            'Confirmar saída'
          )}
        </Button>
      </footer>
    </form>
  )
}

function SummaryChip({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={cn('mt-2 text-sm font-bold text-zinc-950', strong && 'text-base')}>{value || '-'}</p>
    </div>
  )
}
