import { BookOpenText, PackagePlus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { Pagination } from '../../components/ui/Pagination'

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
    <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse bg-white text-sm ${minWidthClassName}`}>
          <thead>
            <tr className="bg-black text-white">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] sm:py-5 ${column.align === 'left' ? 'text-left' : 'text-center'
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
                      className={`px-5 py-5 align-middle text-zinc-700 ${column.align === 'left' ? 'text-left' : 'text-center'
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
  const navigate = useNavigate()
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

  const [productPage, setProductPage] = useState(1)
  const [movementPage, setMovementPage] = useState(1)
  const stockItemsPerPage = 10

  const autoMovementBarcode = searchParams.get('barcode') ?? ''
  const autoOpenMovement = searchParams.get('auto') === '1'

  const filteredProducts = useMemo(() => {
    const term = productQuery.trim().toLowerCase()

    if (!term) {
      return products
    }

    return products.filter((product) =>
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
  const productTotalPages = Math.ceil(filteredProducts.length / stockItemsPerPage)

  const paginatedProducts = useMemo(() => {
    const startIndex = (productPage - 1) * stockItemsPerPage
    const endIndex = productPage * stockItemsPerPage

    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, productPage, stockItemsPerPage])

  const productFirstRecord =
    filteredProducts.length > 0 ? (productPage - 1) * stockItemsPerPage + 1 : 0

  const productLastRecord = Math.min(
    productPage * stockItemsPerPage,
    filteredProducts.length,
  )

  const movementTotalPages = Math.ceil(filteredMovements.length / stockItemsPerPage)

  const paginatedMovements = useMemo(() => {
    const startIndex = (movementPage - 1) * stockItemsPerPage
    const endIndex = movementPage * stockItemsPerPage

    return filteredMovements.slice(startIndex, endIndex)
  }, [filteredMovements, movementPage, stockItemsPerPage])

  const movementFirstRecord =
    filteredMovements.length > 0 ? (movementPage - 1) * stockItemsPerPage + 1 : 0

  const movementLastRecord = Math.min(
    movementPage * stockItemsPerPage,
    filteredMovements.length,
  )

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

  useEffect(() => {
    setProductPage(1)
  }, [productQuery])

  useEffect(() => {
    setMovementPage(1)
  }, [historyStartDate, historyEndDate, historyTypeFilter, historyReasonFilter])

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
      'border-r border-gray-200 px-4 py-2.5 text-sm font-semibold transition sm:px-5',
      active
        ? 'bg-black text-white'
        : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-950',
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

      <div className="flex justify-end">
        <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:items-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="w-full whitespace-nowrap lg:w-auto"
            onClick={() => navigate('/tutoriais/atualizar-estoque')}
          >
            <BookOpenText className="h-4 w-4" />
            Ver tutorial de estoque
          </Button>
          <button
            type="button"
            onClick={() => openMovementModal()}
            className="group inline-flex w-full items-center justify-between gap-4 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-left text-gray-950 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:bg-gray-50 lg:w-auto"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-900">
                <PackagePlus className="h-5 w-5" />
              </span>
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold leading-none">Atualizar estoque</span>
                <span className="mt-1 text-xs text-gray-500">Entrada e saída</span>
              </span>
            </span>
            <span className="text-lg text-gray-400 transition-transform duration-300 group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="border-b-2 border-gray-100 px-5 py-4 text-center sm:px-6">
          <div className="inline-flex w-full justify-center overflow-hidden border-2 border-gray-200 bg-white sm:w-auto">
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
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
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
                  data={paginatedProducts}
                  onRowClick={openProductDetails}
                  columns={[
                    {
                      key: 'product',
                      header: 'Produto',
                      align: 'left',
                      render: (product) => (
                        <div className="min-w-0 text-left">
                          <p className="font-medium text-gray-950 group-hover:underline group-hover:decoration-gray-400 group-hover:underline-offset-4">
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
                        <span className={product.stock_quantity <= product.min_stock ? 'font-semibold text-rose-600' : 'text-gray-950'}>
                          {product.stock_quantity}
                        </span>
                      ),
                    },
                  ]}
                />
                {filteredProducts.length > 0 ? (
                  <div className="flex flex-col gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-gray-500">
                      Exibindo {productFirstRecord}–{productLastRecord} de {filteredProducts.length}{' '}
                      {filteredProducts.length === 1 ? 'registro' : 'registros'}
                      <span className="text-gray-400"> • </span>
                      {stockItemsPerPage} por página
                    </span>

                    <Pagination
                      currentPage={productPage}
                      totalPages={productTotalPages}
                      onPageChange={setProductPage}
                    />
                  </div>
                ) : null}

              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div className="text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Filtros</p>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_190px_190px_auto]">
                      <Input
                        label="Data inicial"
                        type="date"
                        value={historyStartDate}
                        onChange={(event) => setHistoryStartDate(event.target.value)}
                        className={
                          historyStartDate
                            ? 'border-gray-300 bg-white text-gray-950 placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-100'
                            : undefined
                        }
                      />
                      <Input
                        label="Data final"
                        type="date"
                        value={historyEndDate}
                        onChange={(event) => setHistoryEndDate(event.target.value)}
                        className={
                          historyEndDate
                            ? 'border-gray-300 bg-white text-gray-950 placeholder:text-gray-400 focus:border-gray-400 focus:ring-gray-100'
                            : undefined
                        }
                      />
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700">Tipo</span>
                        <select
                          value={historyTypeFilter}
                          onChange={(event) => {
                            const nextType = event.target.value as HistoryTypeFilter
                            setHistoryTypeFilter(nextType)
                          }}
                          className="h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                        >
                          <option value="all" className="text-gray-950">
                            Todos os tipos
                          </option>
                          <option value="entrada" className="text-gray-950">
                            Entrada
                          </option>
                          <option value="saida" className="text-gray-950">
                            Saída
                          </option>
                        </select>
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-sm font-medium text-gray-700">Motivo</span>
                        <select
                          value={historyReasonFilter}
                          onChange={(event) => setHistoryReasonFilter(event.target.value as HistoryReasonFilter)}
                          className="h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                        >
                          {availableHistoryReasonOptions.map((option) => (
                            <option key={option.value} value={option.value} className="text-gray-950">
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="flex items-end">
                        <Button type="button" variant="secondary" className="w-full" onClick={resetHistoryFilters}>
                          Limpar filtros
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <StockTable
                  emptyMessage={loading ? 'Carregando movimentações...' : 'Nenhuma movimentação encontrada.'}
                  data={paginatedMovements}
                  minWidthClassName="min-w-[980px]"
                  onRowClick={openMovementDetails}
                  columns={[
                    {
                      key: 'product',
                      header: 'Produto',
                      align: 'left',
                      render: (movement) => (
                        <div className="min-w-0 text-left">
                          <p className="font-medium text-gray-950 group-hover:underline group-hover:decoration-gray-400 group-hover:underline-offset-4">
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

                {filteredMovements.length > 0 ? (
                  <div className="flex flex-col gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-gray-500">
                      Exibindo {movementFirstRecord}–{movementLastRecord} de {filteredMovements.length}{' '}
                      {filteredMovements.length === 1 ? 'registro' : 'registros'}
                      <span className="text-gray-400"> • </span>
                      {stockItemsPerPage} por página
                    </span>

                    <Pagination
                      currentPage={movementPage}
                      totalPages={movementTotalPages}
                      onPageChange={setMovementPage}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          {error}
        </div>
      ) : null}

      <Modal open={movementModalOpen} title="Atualizar estoque" onClose={closeMovementModal} size="5xl">
        <StockMovementForm
          key={movementProductId || 'empty'}
          products={products}
          submitting={submitting}
          initialProductId={movementProductId}
          onBarcodeScan={handleMovementBarcodeScan}
          onCancel={closeMovementModal}
          submitError={error}
          onSubmit={handleSubmit}
        />
      </Modal>

      <Modal
        open={Boolean(selectedProduct)}
        title={selectedProduct ? selectedProduct.product_model?.name ?? selectedProduct.name : 'Produto'}
        onClose={closeProductDetails}
        size="2xl"
      >
        {selectedProduct ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-gray-950">
              <div className="flex flex-col items-center gap-3 text-center">
                <h3 className="text-2xl font-semibold text-gray-950">
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
              <Button variant="secondary" onClick={closeProductDetails}>
                Fechar
              </Button>
              <Button
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
      >
        {selectedMovement ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-gray-950">
              <div className="flex flex-col items-center gap-3 text-center">
                <h3 className="text-2xl font-semibold text-gray-950">
                  {selectedMovement.type === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque'}
                </h3>
                <p className="text-sm text-gray-600">
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

            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-gray-950">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Observação</p>
              <p className="mt-2 text-sm text-gray-950">{selectedMovement.notes ?? 'Sem observação.'}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={closeMovementDetails}>
                Fechar
              </Button>
              {selectedMovement.product ? (
                <Button
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
    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-950">{value || '-'}</p>
    </div>
  )
}
