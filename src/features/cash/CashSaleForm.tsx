import { Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table } from '../../components/ui/Table'
import { CashSessionBlockedOverlay } from './CashSessionBlockedOverlay'
import { CashInstallmentModal } from './CashInstallmentModal'
import {
  createCashIncome,
  findProductByBarcode,
  friendlyCatalogError,
  listProducts,
  registerSaleWithCashAndStock,
} from '../../lib/catalog'
import {
  formatCurrencyBRL,
  formatCurrencyInput,
  getTodayLocalDate,
  parseCurrencyToNumber,
} from '../../lib/utils'
import type { PaymentMethod, Product } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { isValidBarcode, normalizeBarcode } from '../../lib/barcode'

type EntryMode = 'product_sale' | 'manual_income'

interface SaleLine {
  id: string
  product: Product
  quantity: number
  unitPrice: number
}

interface CashSaleFormProps {
  onCancel: () => void
  onSaved: () => void
  onOpenCash: () => void
  cashSessionId?: string | null
  sessionClosed?: boolean
  initialBarcode?: string
}

export function CashSaleForm({
  onCancel,
  onSaved,
  onOpenCash,
  cashSessionId,
  sessionClosed,
  initialBarcode = '',
}: CashSaleFormProps) {
  const { user } = useAuth()
  const [mode, setMode] = useState<EntryMode>('product_sale')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [items, setItems] = useState<SaleLine[]>([])
  const [description, setDescription] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [salePaymentMode, setSalePaymentMode] = useState<'cash' | 'credit'>('cash')
  const [saleInstallmentsCount, setSaleInstallmentsCount] = useState(1)
  const [installmentModalOpen, setInstallmentModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro')
  const [movementDate, setMovementDate] = useState(getTodayLocalDate())
  const [notes, setNotes] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const cashSessionOpen = Boolean(cashSessionId) && !sessionClosed
  const isBlocked = !cashSessionOpen
  const blockedMessage = 'Abra o caixa para registrar vendas ou gastos.'

  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), [items])
  const saleInstallmentValue = salePaymentMode === 'credit' ? total / Math.max(1, saleInstallmentsCount) : total

  const handleBarcodeScan = useCallback(async (rawCode: string) => {
    if (mode !== 'product_sale') {
      return
    }

    const code = normalizeBarcode(rawCode)

    if (!isValidBarcode(code)) {
      setError('Informe um código de barras válido.')
      return
    }

    setLoadingProducts(true)
    setError('')

    try {
      const product = await findProductByBarcode(code)

      if (!product) {
        setError('Produto não encontrado para este código.')
        return
      }

      addProduct(product)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoadingProducts(false)
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'product_sale') {
      return
    }

    if (!initialBarcode) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      void handleBarcodeScan(initialBarcode)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [handleBarcodeScan, initialBarcode, mode])

  useEffect(() => {
    if (mode !== 'product_sale') {
      return
    }

    const term = query.trim()
    if (term.length < 2) {
      return
    }

    let active = true

    const timeout = window.setTimeout(() => {
      listProducts({ query: term, active: true })
        .then((products) => {
          if (active) {
            setResults(products.slice(0, 8))
          }
        })
        .catch((err) => {
          if (active) {
            setError(friendlyCatalogError(err))
          }
        })
        .finally(() => {
          if (active) {
            setLoadingProducts(false)
          }
        })
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [mode, query])

  function addProduct(product: Product) {
    setError('')

    if (product.stock_quantity <= 0) {
      setError(`Produto sem estoque: ${product.name}.`)
      return
    }

    setItems((current) => {
      const existing = current.find((item) => item.id === product.id)
      if (existing) {
        const nextQuantity = existing.quantity + 1
        if (nextQuantity > product.stock_quantity) {
          setError(`Estoque insuficiente para ${product.name}.`)
          return current
        }

        return current.map((item) => (item.id === product.id ? { ...item, quantity: nextQuantity } : item))
      }

      return [...current, { id: product.id, product, quantity: 1, unitPrice: product.sale_price }]
    })
    setQuery('')
    setResults([])
  }

  function updateQuantity(id: string, quantity: number) {
    setItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item
        }

        const nextQuantity = Math.max(1, Math.min(quantity || 1, item.product.stock_quantity))
        return { ...item, quantity: nextQuantity }
      }),
    )
  }

  function updateUnitPrice(id: string, value: string) {
    const unitPrice = parseCurrencyToNumber(value)
    setItems((current) => current.map((item) => (item.id === id ? { ...item, unitPrice } : item)))
  }

  async function handleSubmit() {
    if (mode === 'manual_income') {
      await submitManualIncome()
      return
    }

    await submitProductSale()
  }

  async function submitProductSale() {
    if (!cashSessionOpen) {
      setError(blockedMessage)
      return
    }

    if (items.length === 0) {
      setError('Adicione pelo menos um produto.')
      return
    }

    const invalidItem = items.find((item) => item.quantity > item.product.stock_quantity)
    if (invalidItem) {
      setError(`Estoque insuficiente para ${invalidItem.product.name}.`)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await registerSaleWithCashAndStock({
        items: items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentMethod: salePaymentMode === 'credit' ? 'cartao_credito' : 'dinheiro',
        installmentsCount: salePaymentMode === 'credit' ? saleInstallmentsCount : 1,
        movementDate,
        notes,
        user,
        cashSessionId,
      })
      onSaved()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitManualIncome() {
    if (!cashSessionOpen) {
      setError(blockedMessage)
      return
    }

    const amount = parseCurrencyToNumber(manualAmount)

    if (!description.trim()) {
      setError('Informe a descrição da entrada.')
      return
    }

    if (amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createCashIncome({
        description,
        amount,
        movementDate,
        paymentMethod,
        notes,
        user,
        cashSessionId,
      })
      onSaved()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative space-y-5 text-white">
      <div className={`space-y-5 ${isBlocked ? 'pointer-events-none blur-[1.5px] select-none' : ''}`}>
        <div className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-1 sm:grid-cols-2">
          <button
            type="button"
            className={`rounded-md px-4 py-3 text-sm font-medium transition ${
              mode === 'product_sale' ? 'bg-white text-gray-950 shadow-sm' : 'text-white/55 hover:bg-white/10'
            }`}
            onClick={() => setMode('product_sale')}
          >
            Venda com produto
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-3 text-sm font-medium transition ${
              mode === 'manual_income' ? 'bg-white text-gray-950 shadow-sm' : 'text-white/55 hover:bg-white/10'
            }`}
            onClick={() => setMode('manual_income')}
          >
            Entrada avulsa
          </button>
        </div>

        {mode === 'product_sale' ? (
          <>
            <div>
              <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-white/35" />
                  <Input
                    className="h-12 pl-10 text-base"
                    tone="dark"
                    placeholder="Buscar por produto, código de barras, marca, tipo, tamanho ou cor"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value)
                      if (event.target.value.trim().length < 2) {
                        setResults([])
                        setLoadingProducts(false)
                      } else {
                        setLoadingProducts(true)
                      }
                    }}
                  />
                </div>
                <BarcodeScanButton
                  label="Ler código"
                  variant="secondary"
                  tone="light"
                  onScan={handleBarcodeScan}
                  className="h-12"
                />
              </div>
              {query.trim().length >= 2 ? (
                <div className="mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-white/10 bg-[#050505] p-1 text-sm shadow-xl">
                  {loadingProducts ? (
                    <div className="px-3 py-3 text-white/55">Buscando produtos...</div>
                  ) : results.length === 0 ? (
                    <div className="px-3 py-3 text-white/55">Nenhum produto encontrado.</div>
                  ) : (
                    results.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-white transition hover:bg-white/5"
                        onClick={() => addProduct(product)}
                      >
                        <span>
                          <span className="block font-medium text-white">{product.product_model?.name ?? product.name}</span>
                          <span className="block text-xs text-white/55">
                            {[
                              product.product_model?.reference,
                              product.barcode,
                              product.product_model?.family,
                              product.product_model?.brand?.name ?? product.brand?.name,
                              product.product_model?.category?.name ?? product.clothing_type?.name,
                              product.size?.name,
                              product.color?.name,
                            ]
                              .filter(Boolean)
                              .join(' • ') || 'Sem detalhes'}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-white/75">
                          Estoque {product.stock_quantity}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            <Table
              tone="dark"
              data={items}
              emptyMessage="Nenhum produto adicionado."
              columns={[
                {
                  key: 'product',
                  header: 'Produto',
                  render: (item) => (
                    <div>
                      <p className="font-medium text-white">{item.product.product_model?.name ?? item.product.name}</p>
                      <p className="text-xs text-white/55">
                        {[
                          item.product.product_model?.reference,
                          item.product.barcode,
                          item.product.product_model?.family,
                          item.product.product_model?.brand?.name ?? item.product.brand?.name,
                          item.product.product_model?.category?.name ?? item.product.clothing_type?.name,
                          item.product.size?.name,
                          item.product.color?.name,
                        ]
                          .filter(Boolean)
                          .join(' • ') || '-'}
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'quantity',
                  header: 'Qtd.',
                  render: (item) => (
                    <Input
                      className="w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      tone="dark"
                      type="number"
                      min="1"
                      max={item.product.stock_quantity}
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                    />
                  ),
                },
                {
                  key: 'unit',
                  header: 'Unitário',
                  render: (item) => (
                    <Input
                      className="w-32"
                      tone="dark"
                      type="text"
                      inputMode="numeric"
                      value={formatCurrencyBRL(item.unitPrice)}
                      onChange={(event) => updateUnitPrice(item.id, formatCurrencyInput(event.target.value))}
                    />
                  ),
                },
                { key: 'total', header: 'Total', render: (item) => formatCurrencyBRL(item.quantity * item.unitPrice) },
                {
                  key: 'remove',
                  header: '',
                  render: (item) => (
                    <Button
                      tone="dark"
                      variant="ghost"
                      size="sm"
                      onClick={() => setItems((current) => current.filter((line) => line.id !== item.id))}
                      aria-label="Remover produto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]}
            />
          </>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <Input tone="dark" label="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} required />
            <Input
              tone="dark"
              label="Valor"
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={manualAmount}
              onChange={(event) => setManualAmount(formatCurrencyInput(event.target.value))}
              required
            />
          </div>
        )}

      {error ? <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}

      {mode === 'product_sale' ? (
        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/5 p-4 md:grid-cols-[1.2fr_160px_180px] md:items-end">
          <div className="space-y-2">
            <span className="text-sm font-medium text-white/75">Forma de pagamento</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-md px-4 py-3 text-sm font-medium transition ${
                  salePaymentMode === 'cash' ? 'bg-white text-gray-950 shadow-sm' : 'text-white/55 hover:bg-white/10'
                }`}
                onClick={() => {
                  setSalePaymentMode('cash')
                  setSaleInstallmentsCount(1)
                  setInstallmentModalOpen(false)
                }}
              >
                Dinheiro
              </button>
              <button
                type="button"
                className={`rounded-md px-4 py-3 text-sm font-medium transition ${
                  salePaymentMode === 'credit' ? 'bg-white text-gray-950 shadow-sm' : 'text-white/55 hover:bg-white/10'
                }`}
                onClick={() => {
                  setSalePaymentMode('credit')
                  setInstallmentModalOpen(true)
                }}
              >
                Crédito
              </button>
            </div>
            <p className="text-xs text-white/45">
              {salePaymentMode === 'credit'
                ? `${saleInstallmentsCount}x de ${formatCurrencyBRL(saleInstallmentValue)}`
                : 'Pagamento em dinheiro para conferência do caixa.'}
            </p>
          </div>

          <Input tone="dark" label="Data" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} />

          <div>
            <p className="text-sm text-white/55">Total da venda</p>
            <p className="text-3xl font-semibold text-white">{formatCurrencyBRL(total)}</p>
            <p className="mt-1 text-xs text-white/45">
              {salePaymentMode === 'credit'
                ? `${saleInstallmentsCount} parcelas de ${formatCurrencyBRL(saleInstallmentValue)}`
                : 'À vista'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/5 p-4 md:grid-cols-[1fr_160px_180px] md:items-end">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/75">Forma de pagamento</span>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/10"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            >
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="cartao_debito">Cartão de débito</option>
              <option value="cartao_credito">Cartão de crédito</option>
              <option value="outro">Outro</option>
            </select>
          </label>
          <Input tone="dark" label="Data" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} />
          <div>
            <p className="text-sm text-white/55">Total da entrada</p>
            <p className="text-3xl font-semibold text-white">{formatCurrencyBRL(parseCurrencyToNumber(manualAmount))}</p>
          </div>
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-white/75">Observação</span>
        <textarea
          className="min-h-20 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/20 focus:ring-2 focus:ring-white/10"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
        <Button tone="dark" variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          tone="dark"
          onClick={() => void handleSubmit()}
          disabled={submitting || !cashSessionOpen || (mode === 'product_sale' && items.length === 0)}
        >
          {submitting ? 'Registrando...' : mode === 'product_sale' ? 'Registrar venda' : 'Registrar entrada'}
        </Button>
      </div>

      <CashInstallmentModal
        open={installmentModalOpen}
        total={total}
        installmentsCount={saleInstallmentsCount}
        onSelectInstallmentsCount={setSaleInstallmentsCount}
        onCancel={() => {
          setInstallmentModalOpen(false)
          setSalePaymentMode('cash')
          setSaleInstallmentsCount(1)
        }}
        onConfirm={(count) => {
          setSaleInstallmentsCount(count)
          setSalePaymentMode('credit')
          setInstallmentModalOpen(false)
        }}
      />
      </div>

      {isBlocked ? <CashSessionBlockedOverlay onOpenCash={onOpenCash} /> : null}
    </div>
  )
}
