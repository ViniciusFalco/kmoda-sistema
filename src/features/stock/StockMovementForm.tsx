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
  submitError?: string
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
  submitError = '',
  onSubmit,
}: StockMovementFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [movementType, setMovementType] = useState<StockMovementType>('entrada')
  const [reason, setReason] = useState<StockMovementReason>('compra')
  const [quantity, setQuantity] = useState(1)
  const [observation, setObservation] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [formError, setFormError] = useState('')

  const isSubmitting = submitting
  const currentReasonOptions = reasonOptionsByType[movementType]
  const selectedProductStock = selectedProduct?.stock_quantity ?? 0
  const quantityError =
    movementType === 'saida' && selectedProduct && quantity > selectedProductStock
      ? 'Quantidade maior que o estoque disponível.'
      : ''

  const showManualSaleWarning = movementType === 'saida' && reason === 'venda_manual'
  const visibleError = formError || submitError

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

  useEffect(() => {
    const nextReason = currentReasonOptions[0]?.value ?? 'compra'
    setReason(nextReason)
    setFormError('')
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
    setFormError('')
  }

  function resetForm() {
    setSelectedProduct(null)
    setMovementType('entrada')
    setReason('compra')
    setQuantity(1)
    setObservation('')
    setSearchTerm('')
    setSearchFocused(false)
    setFormError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProduct) {
      setFormError('Selecione um produto para atualizar o estoque.')
      return
    }

    if (!movementType || !reason) {
      setFormError('Selecione o tipo e o motivo da movimentação.')
      return
    }

    if (quantity <= 0 || !Number.isFinite(quantity)) {
      setFormError('Informe uma quantidade válida.')
      return
    }

    if (quantityError) {
      setFormError(quantityError)
      return
    }

    setFormError('')
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
    <form className="space-y-4" onSubmit={handleSubmit}>
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

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Produto
          </span>

          <div className="relative">
            <Input
              className="h-11"
              placeholder="Buscar por nome, código ou referência"
              autoFocus
              value={searchTerm}
              onBlur={() => {
                window.setTimeout(() => setSearchFocused(false), 120)
              }}
              onChange={(event) => {
                const value = event.target.value
                setSearchTerm(value)
                setSearchFocused(true)
                setFormError('')

                if (selectedProduct) {
                  setSelectedProduct(null)
                }
              }}
            />

            {searchFocused && !selectedProduct ? (
              <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                {filteredProducts.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-500">
                    Nenhum produto encontrado.
                  </div>
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
                      <span className="text-sm font-semibold text-gray-950">
                        {getProductTitle(product)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getProductMeta(product) || 'Sem referência'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </label>

        {onBarcodeScan ? (
          <BarcodeScanButton
            label="Ler código"
            variant="secondary"
            onScan={onBarcodeScan}
            className="h-11 w-full shrink-0 lg:w-auto"
          />
        ) : null}
      </section>

      {selectedProduct ? (
        <section className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-950 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Produto selecionado
              </p>
              <h3 className="mt-1 truncate text-lg font-semibold tracking-[-0.03em] text-gray-950">
                {getProductTitle(selectedProduct)}
              </h3>
            </div>

            <SummaryChip
              label="Marca"
              value={selectedProduct.product_model?.brand?.name ?? selectedProduct.brand?.name ?? '-'}
            />
            <SummaryChip label="Tamanho" value={selectedProduct.size?.name ?? '-'} />
            <SummaryChip label="Cor" value={selectedProduct.color?.name ?? '-'} />
            <SummaryChip label="Estoque" value={String(selectedProduct.stock_quantity)} strong />
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Selecione um produto para continuar.
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-1.5 lg:col-span-6">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Movimentação
          </span>

          <div className="grid grid-cols-2 rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              className={cn(
                'rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                movementType === 'entrada'
                  ? 'bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
                  : 'text-gray-600 hover:bg-white hover:text-gray-950',
              )}
              onClick={() => {
                setMovementType('entrada')
                setFormError('')
              }}
            >
              Entrada
            </button>

            <button
              type="button"
              className={cn(
                'rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                movementType === 'saida'
                  ? 'bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.14)]'
                  : 'text-gray-600 hover:bg-white hover:text-gray-950',
              )}
              onClick={() => {
                setMovementType('saida')
                setFormError('')
              }}
            >
              Saída
            </button>
          </div>
        </div>

        <label className="block space-y-1.5 lg:col-span-6">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Motivo
          </span>

          <select
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as StockMovementReason)
              setFormError('')
            }}
            className="h-11 w-full rounded-md border-2 border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          >
            {currentReasonOptions.map((option) => (
              <option key={option.value} value={option.value} className="text-gray-950">
                {option.label}
              </option>
            ))}
          </select>
          {showManualSaleWarning ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800">
              Atenção: esta venda manual vai retirar o produto do estoque, mas não será lançada no caixa.
            </div>
          ) : null}
        </label>

        <div className="space-y-1.5 lg:col-span-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Quantidade
          </span>

          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-11 rounded-md px-0"
              onClick={() => {
                setFormError('')
                setQuantity((current) => Math.max(1, current - 1))
              }}
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
                setFormError('')

                if (!Number.isFinite(nextValue) || nextValue < 1) {
                  setQuantity(1)
                  return
                }

                setQuantity(Math.floor(nextValue))
              }}
              className="stock-qty-input h-11 text-center text-base font-semibold tracking-[-0.02em]"
            />

            <Button
              type="button"
              variant="secondary"
              className="h-11 w-11 rounded-md px-0"
              onClick={() => {
                setFormError('')
                setQuantity((current) => {
                  if (movementType === 'saida' && selectedProduct) {
                    return Math.min(selectedProductStock, current + 1)
                  }

                  return current + 1
                })
              }}
              disabled={
                movementType === 'saida' && Boolean(selectedProduct)
                  ? quantity >= selectedProductStock
                  : false
              }
              aria-label="Aumentar quantidade"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {quantityError ? (
            <p className="text-xs font-medium text-rose-600">{quantityError}</p>
          ) : null}
        </div>

        <label className="block space-y-1.5 lg:col-span-8">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Observação
          </span>

          <textarea
            value={observation}
            onChange={(event) => {
              setObservation(event.target.value)
              setFormError('')
            }}
            placeholder="Opcional"
            className="h-20 w-full resize-none rounded-md border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          />
        </label>
      </section>

      {visibleError ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
          aria-live="polite"
        >
          {visibleError}
        </div>
      ) : null}

      <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
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

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? (
            'Salvando...'
          ) : showManualSaleWarning ? (
            'Confirmar saída sem caixa'
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
    <div className="min-w-[96px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className={cn('mt-1 text-xs font-bold text-zinc-950', strong && 'text-sm')}>
        {value || '-'}
      </p>
    </div>
  )
}
