import { PackagePlus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  createStockMovement,
  findProductByBarcode,
  friendlyCatalogError,
  listProducts,
  listStockMovements,
} from '../../lib/catalog'
import { formatCurrencyBRL, formatDateBR } from '../../lib/utils'
import type { Product, StockMovement, StockMovementReason, StockMovementType } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { StockMovementForm, type StockMovementFormValues } from './StockMovementForm'

type StockTab = 'products' | 'history'
type HistoryReasonFilter = 'all' | StockMovementReason
type HistoryTypeFilter = 'all' | StockMovementType

interface TableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  align?: 'left' | 'center'
}

interface StockTableProps<T extends { id: string }> {
  columns: Array<TableColumn<T>>
  data: T[]
  emptyMessage: string
  minWidthClassName?: string
  onRowClick?: (row: T) => void
}

const stockReasonLabels: Record<StockMovementReason, string> = {
  cadastro_inicial: 'Cadastro inicial',
  compra: 'Compra',
  devolucao: 'Devolução',
  ajuste_positivo: 'Ajuste positivo',
  correcao_estoque: 'Correção de estoque',
  venda: 'Venda',
  venda_manual: 'Venda manual',
  ajuste_manual: 'Ajuste manual',
  troca: 'Troca',
  perda: 'Perda',
  avaria: 'Avaria',
  ajuste_negativo: 'Ajuste negativo',
  devolucao_ao_fornecedor: 'Devolução ao fornecedor',
}

const historyReasonOptions: Array<{ value: HistoryReasonFilter; label: string; type?: StockMovementType }> = [
  { value: 'all', label: 'Todos os motivos' },
  { value: 'cadastro_inicial', label: stockReasonLabels.cadastro_inicial, type: 'entrada' },
  { value: 'compra', label: stockReasonLabels.compra, type: 'entrada' },
  { value: 'devolucao', label: stockReasonLabels.devolucao, type: 'entrada' },
  { value: 'ajuste_positivo', label: stockReasonLabels.ajuste_positivo, type: 'entrada' },
  { value: 'correcao_estoque', label: stockReasonLabels.correcao_estoque },
  { value: 'ajuste_manual', label: stockReasonLabels.ajuste_manual },
  { value: 'venda', label: stockReasonLabels.venda, type: 'saida' },
  { value: 'venda_manual', label: stockReasonLabels.venda_manual, type: 'saida' },
  { value: 'troca', label: stockReasonLabels.troca, type: 'saida' },
  { value: 'perda', label: stockReasonLabels.perda, type: 'saida' },
  { value: 'avaria', label: stockReasonLabels.avaria, type: 'saida' },
  { value: 'ajuste_negativo', label: stockReasonLabels.ajuste_negativo, type: 'saida' },
  { value: 'devolucao_ao_fornecedor', label: stockReasonLabels.devolucao_ao_fornecedor, type: 'saida' },
]

function StockTable<T extends { id: string }>({
  columns,
  data,
  emptyMessage,
  minWidthClassName = 'min-w-[860px]',
  onRowClick,
}: StockTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse bg-white text-sm ${minWidthClassName}`}>
          <thead>
            <tr className="bg-black text-white">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-5 text-[12px] font-semibold uppercase tracking-[0.22em] sm:py-6 ${
                    column.align === 'left' ? 'text-left' : 'text-center'
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {data.length === 0 ? (
              <tr>
                <td className="px-4 py-14 text-center text-sm text-zinc-500" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  className={`group transition ${onRowClick ? 'cursor-pointer hover:bg-zinc-50' : 'hover:bg-zinc-50'}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  aria-label={onRowClick ? `Ver detalhes de ${String((row as { name?: string }).name ?? row.id)}` : undefined}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-5 py-5 align-middle text-zinc-700 ${
                        column.align === 'left' ? 'text-left' : 'text-center'
                      }`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function toLocalDateKey(value: string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getStockMovementTitle(movement: StockMovement) {
  return movement.product?.product_model?.name ?? movement.product?.name ?? 'Movimentação'
}

export function StockPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [activeTab, setActiveTab] = useState<StockTab>('products')
  const [movementModalOpen, setMovementModalOpen] = useState(false)
  const [movementProductId, setMovementProductId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null)
  const [historyStartDate, setHistoryStartDate] = useState('')
  const [historyEndDate, setHistoryEndDate] = useState('')
  const [historyTypeFilter, setHistoryTypeFilter] = useState<HistoryTypeFilter>('all')
  const [historyReasonFilter, setHistoryReasonFilter] = useState<HistoryReasonFilter>('all')

  const autoMovementBarcode = searchParams.get('barcode') ?? ''
  const autoOpenMovement = searchParams.get('auto') === '1'

  const filteredProducts = useMemo(() => {
    const term = productQuery.trim().toLowerCase()

    if (!term) {
      return products.slice(0, 8)
    }

    return products
      .filter((product) =>
        [
          product.name,
          product.barcode,
          product.reference,
          product.product_model?.name,
          product.product_model?.reference,
          product.product_model?.family,
          product.product_model?.brand?.name ?? product.brand?.name,
          product.product_model?.category?.name ?? product.clothing_type?.name,
          product.size?.name,
          product.color?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      )
      .slice(0, 12)
  }, [productQuery, products])

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const movementDate = toLocalDateKey(movement.created_at)

      if (historyStartDate && movementDate < historyStartDate) {
        return false
      }

      if (historyEndDate && movementDate > historyEndDate) {
        return false
      }

      if (historyTypeFilter !== 'all' && movement.type !== historyTypeFilter) {
        return false
      }

      if (historyReasonFilter !== 'all' && movement.reason !== historyReasonFilter) {
        return false
      }

      return true
    })
  }, [historyEndDate, historyReasonFilter, historyStartDate, historyTypeFilter, movements])

  const availableHistoryReasonOptions = useMemo(
    () =>
      historyReasonOptions.filter((option) => {
        if (option.value === 'all') {
          return true
        }

        if (historyTypeFilter === 'all') {
          return true
        }

        return !option.type || option.type === historyTypeFilter
      }),
    [historyTypeFilter],
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [productRows, movementRows] = await Promise.all([
        listProducts({ active: true }),
        listStockMovements(),
      ])
      setProducts(productRows)
      setMovements(movementRows)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const openMovementModal = useCallback((productId = '') => {
    setError('')
    setMovementProductId(productId)
    setMovementModalOpen(true)
  }, [])

  const openProductDetails = useCallback((product: Product) => {
    setSelectedMovement(null)
    setSelectedProduct(product)
  }, [])

  const openMovementDetails = useCallback((movement: StockMovement) => {
    setSelectedProduct(null)
    setSelectedMovement(movement)
  }, [])

  const closeProductDetails = useCallback(() => {
    setSelectedProduct(null)
  }, [])

  const closeMovementDetails = useCallback(() => {
    setSelectedMovement(null)
  }, [])

  const resetHistoryFilters = useCallback(() => {
    setHistoryStartDate('')
    setHistoryEndDate('')
    setHistoryTypeFilter('all')
    setHistoryReasonFilter('all')
  }, [])

  const handleMovementBarcodeScan = useCallback(
    async (code: string) => {
      setError('')

      try {
        const product = await findProductByBarcode(code)

        if (!product) {
          setError('Produto não encontrado para este código.')
          return
        }

        openMovementModal(product.id)
      } catch (err) {
        setError(friendlyCatalogError(err))
      }
    },
    [openMovementModal],
  )

  const handleProductBarcodeScan = useCallback(
    async (code: string) => {
      setError('')
      setProductQuery(code)

      try {
        const product = await findProductByBarcode(code)

        if (!product) {
          setError('Produto não encontrado para este código.')
          return
        }

        openProductDetails(product)
      } catch (err) {
        setError(friendlyCatalogError(err))
      }
    },
    [openProductDetails],
  )

  useEffect(() => {
    if (!autoOpenMovement || !autoMovementBarcode) {
      return
    }

    queueMicrotask(() => {
      void handleMovementBarcodeScan(autoMovementBarcode)
    })
  }, [autoMovementBarcode, autoOpenMovement, handleMovementBarcodeScan])

  useEffect(() => {
    queueMicrotask(() => {
      void loadData()
    })
  }, [loadData])

  useEffect(() => {
    if (historyReasonFilter === 'all') {
      return
    }

    const selectedReason = historyReasonOptions.find((option) => option.value === historyReasonFilter)
    if (selectedReason && selectedReason.type && selectedReason.type !== historyTypeFilter && historyTypeFilter !== 'all') {
      setHistoryReasonFilter('all')
    }
  }, [historyReasonFilter, historyTypeFilter])

  async function handleSubmit(values: StockMovementFormValues) {
    if (!values.product_id) {
      setError('Selecione um produto.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createStockMovement({
        productId: values.product_id,
        type: values.type,
        reason: values.reason,
        quantity: Number(values.quantity),
        notes: values.notes,
        user,
      })
      closeMovementModal()
      await loadData()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  function closeMovementModal() {
    setMovementModalOpen(false)
    setMovementProductId('')
  }

  const tabButtonClass = (active: boolean) =>
    [
      'rounded-full px-4 py-2 text-sm font-semibold transition',
      active
        ? 'bg-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
        : 'bg-transparent text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950',
    ].join(' ')

  const panelAnimation = {
    animation: 'stock-panel-in 240ms ease-out',
  } as const

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes stock-panel-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(135deg,#050505_0%,#121212_48%,#0a0a0a_100%)] px-6 pb-8 pt-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:px-8 sm:pb-10 sm:pt-10 lg:px-10 lg:pt-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 text-left">
            <h1 className="text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">Estoque</h1>
          </div>

          <button
            type="button"
            onClick={() => openMovementModal()}
            className="group inline-flex w-full items-center justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white px-4 py-4 text-left text-zinc-950 shadow-[0_18px_45px_rgba(0,0,0,0.24)] transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(0,0,0,0.28)] lg:w-auto"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 text-white">
                <PackagePlus className="h-5 w-5" />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold leading-none">Atualizar estoque</span>
                <span className="mt-1 text-xs text-zinc-500">Entrada e saída</span>
              </span>
            </span>
            <span className="text-lg text-zinc-400 transition-transform duration-300 group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="border-b border-zinc-200 px-5 py-6 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">
            {activeTab === 'products' ? 'Lista de Produtos' : 'Histórico de movimentações'}
          </h2>

          <div className="mt-4 inline-flex w-full justify-center rounded-full border border-zinc-200 bg-zinc-100 p-1 sm:w-auto">
            <button
              type="button"
              aria-pressed={activeTab === 'products'}
              className={tabButtonClass(activeTab === 'products')}
              onClick={() => setActiveTab('products')}
            >
              Lista de Produtos
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'history'}
              className={tabButtonClass(activeTab === 'history')}
              onClick={() => setActiveTab('history')}
            >
              Histórico
            </button>
          </div>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <div key={activeTab} style={panelAnimation}>
            {activeTab === 'products' ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="relative w-full max-w-2xl">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-zinc-400" />
                    <Input
                      id="stock-search"
                      className="h-12 pl-10 text-base"
                      placeholder="Digite nome, código de barras, marca, tipo, cor ou tamanho"
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                    />
                  </div>

                  <BarcodeScanButton
                    label="Ler código de barras"
                    variant="default"
                    onScan={handleProductBarcodeScan}
                    className="h-12 w-full lg:w-auto"
                  />
                </div>

                <StockTable
                  emptyMessage={loading ? 'Carregando produtos...' : 'Nenhum produto encontrado.'}
                  data={filteredProducts}
                  onRowClick={openProductDetails}
                  columns={[
                    {
                      key: 'product',
                      header: 'Produto',
                      align: 'left',
                      render: (product) => (
                        <div className="min-w-0 text-left">
                          <p className="font-medium text-zinc-950 group-hover:underline group-hover:decoration-zinc-400 group-hover:underline-offset-4">
                            {product.product_model?.name ?? product.name}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'brand',
                      header: 'Marca',
                      render: (product) => product.product_model?.brand?.name ?? product.brand?.name ?? '-',
                    },
                    {
                      key: 'type',
                      header: 'Tipo',
                      render: (product) => product.product_model?.category?.name ?? product.clothing_type?.name ?? '-',
                    },
                    { key: 'size', header: 'Tamanho', render: (product) => product.size?.name ?? '-' },
                    { key: 'color', header: 'Cor', render: (product) => product.color?.name ?? '-' },
                    {
                      key: 'stock',
                      header: 'Estoque',
                      render: (product) => (
                        <span className={product.stock_quantity <= product.min_stock ? 'font-semibold text-rose-600' : 'text-zinc-950'}>
                          {product.stock_quantity}
                        </span>
                      ),
                    },
                  ]}
                />

                {productQuery.trim() ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                    Mostrando <span className="font-semibold text-zinc-950">{filteredProducts.length}</span> produtos filtrados
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[1.75rem] border border-zinc-900/80 bg-[linear-gradient(135deg,#050505_0%,#111111_55%,#080808_100%)] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div className="text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">Filtros</p>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_190px_190px_auto]">
                      <Input
                        label="Data inicial"
                        type="date"
                        value={historyStartDate}
                        onChange={(event) => setHistoryStartDate(event.target.value)}
                        tone="dark"
                        className={
                          historyStartDate
                            ? 'border-white bg-white text-zinc-950 placeholder:text-zinc-400 focus:border-white focus:ring-white/20'
                            : undefined
                        }
                      />
                      <Input
                        label="Data final"
                        type="date"
                        value={historyEndDate}
                        onChange={(event) => setHistoryEndDate(event.target.value)}
                        tone="dark"
                        className={
                          historyEndDate
                            ? 'border-white bg-white text-zinc-950 placeholder:text-zinc-400 focus:border-white focus:ring-white/20'
                            : undefined
                        }
                      />
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-white/75">Tipo</span>
                        <select
                          value={historyTypeFilter}
                          onChange={(event) => {
                            const nextType = event.target.value as HistoryTypeFilter
                            setHistoryTypeFilter(nextType)
                          }}
                          className={`h-10 w-full rounded-md border px-3 text-sm outline-none transition focus:ring-2 ${
                            historyTypeFilter === 'all'
                              ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10'
                              : 'border-white bg-white text-zinc-950 focus:border-white focus:ring-white/20'
                          }`}
                        >
                          <option value="all" className="text-zinc-950">
                            Todos os tipos
                          </option>
                          <option value="entrada" className="text-zinc-950">
                            Entrada
                          </option>
                          <option value="saida" className="text-zinc-950">
                            Saída
                          </option>
                        </select>
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-white/75">Motivo</span>
                        <select
                          value={historyReasonFilter}
                          onChange={(event) => setHistoryReasonFilter(event.target.value as HistoryReasonFilter)}
                          className={`h-10 w-full rounded-md border px-3 text-sm outline-none transition focus:ring-2 ${
                            historyReasonFilter === 'all'
                              ? 'border-white/10 bg-white/5 text-white focus:border-white/20 focus:ring-white/10'
                              : 'border-white bg-white text-zinc-950 focus:border-white focus:ring-white/20'
                          }`}
                        >
                          {availableHistoryReasonOptions.map((option) => (
                            <option key={option.value} value={option.value} className="text-zinc-950">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex items-end">
                        <Button type="button" variant="secondary" tone="dark" className="w-full" onClick={resetHistoryFilters}>
                          Limpar filtros
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <StockTable
                  emptyMessage={loading ? 'Carregando movimentações...' : 'Nenhuma movimentação encontrada.'}
                  data={filteredMovements}
                  minWidthClassName="min-w-[980px]"
                  onRowClick={openMovementDetails}
                  columns={[
                    {
                      key: 'product',
                      header: 'Produto',
                      align: 'left',
                      render: (movement) => (
                        <div className="min-w-0 text-left">
                          <p className="font-medium text-zinc-950 group-hover:underline group-hover:decoration-zinc-400 group-hover:underline-offset-4">
                            {getStockMovementTitle(movement)}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: 'type',
                      header: 'Tipo',
                      render: (movement) => (movement.type === 'entrada' ? 'Entrada' : 'Saída'),
                    },
                    {
                      key: 'reason',
                      header: 'Motivo',
                      render: (movement) => stockReasonLabels[movement.reason] ?? movement.reason,
                    },
                    { key: 'quantity', header: 'Qtd.', render: (movement) => movement.quantity },
                    { key: 'date', header: 'Data', render: (movement) => formatDateBR(movement.created_at) },
                    {
                      key: 'cash',
                      header: 'Lançamento',
                      render: (movement) => movement.cash_movement?.movement_code ?? movement.sale_id?.slice(0, 8).toUpperCase() ?? '-',
                    },
                    { key: 'notes', header: 'Observação', render: (movement) => movement.notes ?? '-' },
                  ]}
                />

                {(historyStartDate || historyEndDate || historyTypeFilter !== 'all' || historyReasonFilter !== 'all') ? (
                  <div className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-center text-sm text-zinc-700 shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
                    Mostrando <span className="font-semibold text-zinc-950">{filteredMovements.length}</span> linhas filtradas
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
          {error}
        </div>
      ) : null}

      <Modal open={movementModalOpen} title="Atualizar estoque" onClose={closeMovementModal} size="5xl" tone="dark">
        <StockMovementForm
          key={movementProductId || 'empty'}
          products={products}
          submitting={submitting}
          initialProductId={movementProductId}
          onBarcodeScan={handleMovementBarcodeScan}
          onCancel={closeMovementModal}
          onSubmit={handleSubmit}
        />
      </Modal>

      <Modal
        open={Boolean(selectedProduct)}
        title={selectedProduct ? selectedProduct.product_model?.name ?? selectedProduct.name : 'Produto'}
        onClose={closeProductDetails}
        size="2xl"
        tone="dark"
      >
        {selectedProduct ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white px-4 py-4 text-center text-zinc-950">
              <div className="flex flex-col items-center gap-3 text-center">
                <h3 className="text-2xl font-semibold text-zinc-950">
                  {selectedProduct.product_model?.name ?? selectedProduct.name}
                </h3>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label="Código de barras" value={selectedProduct.barcode ?? 'Sem código'} />
              <DetailCard label="Referência" value={selectedProduct.product_model?.reference ?? selectedProduct.reference ?? '-'} />
              <DetailCard label="Marca" value={selectedProduct.product_model?.brand?.name ?? selectedProduct.brand?.name ?? '-'} />
              <DetailCard label="Tipo" value={selectedProduct.product_model?.category?.name ?? selectedProduct.clothing_type?.name ?? '-'} />
              <DetailCard label="Tamanho" value={selectedProduct.size?.name ?? '-'} />
              <DetailCard label="Cor" value={selectedProduct.color?.name ?? '-'} />
              <DetailCard label="Preço de venda" value={formatCurrencyBRL(selectedProduct.sale_price)} />
              <DetailCard label="Estoque mínimo" value={String(selectedProduct.min_stock)} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" tone="dark" onClick={closeProductDetails}>
                Fechar
              </Button>
              <Button
                tone="dark"
                onClick={() => {
                  openMovementModal(selectedProduct.id)
                  closeProductDetails()
                }}
              >
                <PackagePlus className="h-4 w-4" />
                Atualizar estoque
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(selectedMovement)}
        title={selectedMovement ? `Movimentação ${selectedMovement.cash_movement?.movement_code ?? selectedMovement.id.slice(0, 8).toUpperCase()}` : 'Movimentação'}
        onClose={closeMovementDetails}
        size="2xl"
        tone="dark"
      >
        {selectedMovement ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-white px-4 py-4 text-center text-zinc-950">
              <div className="flex flex-col items-center gap-3 text-center">
                <h3 className="text-2xl font-semibold text-zinc-950">
                  {selectedMovement.type === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'}
                </h3>
                <p className="text-sm text-zinc-600">
                  {getStockMovementTitle(selectedMovement)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailCard label="Produto" value={getStockMovementTitle(selectedMovement)} />
              <DetailCard label="Tipo" value={selectedMovement.type === 'entrada' ? 'Entrada' : 'Saída'} />
              <DetailCard label="Motivo" value={stockReasonLabels[selectedMovement.reason] ?? selectedMovement.reason} />
              <DetailCard label="Quantidade" value={String(selectedMovement.quantity)} />
              <DetailCard label="Data" value={formatDateBR(selectedMovement.created_at)} />
              <DetailCard
                label="Lançamento"
                value={selectedMovement.cash_movement?.movement_code ?? selectedMovement.sale_id?.slice(0, 8).toUpperCase() ?? '-'}
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white px-4 py-4 text-center text-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Observação</p>
              <p className="mt-2 text-sm text-zinc-950">{selectedMovement.notes ?? 'Sem observação.'}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" tone="dark" onClick={closeMovementDetails}>
                Fechar
              </Button>
              {selectedMovement.product ? (
                <Button
                  tone="dark"
                  onClick={() => {
                    if (selectedMovement.product) {
                      openProductDetails(selectedMovement.product)
                      closeMovementDetails()
                    }
                  }}
                >
                  Ver produto
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-center shadow-[0_10px_24px_rgba(0,0,0,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-950">{value || '-'}</p>
    </div>
  )
}
