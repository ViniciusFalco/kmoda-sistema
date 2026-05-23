import { Barcode, Boxes, PackagePlus, Receipt, ShoppingCart, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarcodeResultModal, type BarcodeLookupResult } from '../../components/barcode/BarcodeResultModal'
import { BarcodeScanModal } from '../../components/barcode/BarcodeScanModal'
import { ActionCard } from '../../components/ui/ActionCard'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { Table } from '../../components/ui/Table'
import {
  createProduct,
  createRegistryItem,
  findBarcodeLookup,
  friendlyCatalogError,
  getMonthSalesTotal,
  getTodayCashSession,
  getTodaySalesTotal,
  listStockMovements,
  listTodayCashMovements,
  loadProductRegistries,
  type ProductInput,
  type RegistryInput,
} from '../../lib/catalog'
import { formatCurrency, todayISODate } from '../../lib/utils'
import type { Brand, CashMovement, CashSession, ClothingType, Color, RegistryKind, Size, StockMovement } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { ProductForm, type ProductFormValues, type ProductSubmitMode } from '../products/ProductForm'

interface ProductRegistries {
  brands: Brand[]
  clothingTypes: ClothingType[]
  sizes: Size[]
  colors: Color[]
}

const emptyRegistries: ProductRegistries = {
  brands: [],
  clothingTypes: [],
  sizes: [],
  colors: [],
}

interface DashboardMovementRow {
  id: string
  createdAt: string
  time: string
  type: string
  description: string
  value: number | null
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { open: barcodeScannerOpen, barcode: barcodeValue, setBarcode: setBarcodeValue, openScanner, closeScanner } =
    useBarcodeScanner()
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [registries, setRegistries] = useState<ProductRegistries>(emptyRegistries)
  const [cashSession, setCashSession] = useState<CashSession | null>(null)
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [salesTodayTotal, setSalesTodayTotal] = useState(0)
  const [monthSalesTotal, setMonthSalesTotal] = useState(0)
  const [barcodeResult, setBarcodeResult] = useState<BarcodeLookupResult | null>(null)
  const [productBarcodePrefill, setProductBarcodePrefill] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const incomeToday = useMemo(
    () =>
      cashMovements
        .filter((movement) => movement.type === 'income')
        .reduce((sum, movement) => sum + movement.amount, 0),
    [cashMovements],
  )

  const expenseToday = useMemo(
    () =>
      cashMovements
        .filter((movement) => movement.type === 'expense')
        .reduce((sum, movement) => sum + movement.amount, 0),
    [cashMovements],
  )

  const balanceToday = useMemo(
    () => (cashSession?.opening_amount ?? 0) + incomeToday - expenseToday,
    [cashSession?.opening_amount, expenseToday, incomeToday],
  )

  const latestMovements = useMemo<DashboardMovementRow[]>(() => {
    const cashRows = cashMovements.map((movement) => ({
      id: `cash-${movement.id}`,
      createdAt: movement.created_at,
      time: formatTime(movement.created_at),
      type: movement.type === 'income' ? (movement.origin === 'sale' ? 'Venda' : 'Entrada avulsa') : 'Gasto',
      description: movementDescription(movement),
      value: movement.type === 'expense' ? -movement.amount : movement.amount,
    }))

    const stockRows = stockMovements.map((movement) => ({
      id: `stock-${movement.id}`,
      createdAt: movement.created_at,
      time: formatTime(movement.created_at),
      type: movement.type === 'entrada' ? 'Entrada de estoque' : 'Saída de estoque',
      description: stockMovementDescription(movement),
      value: null,
    }))

    return [...cashRows, ...stockRows]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
  }, [cashMovements, stockMovements])

  const handleBarcodeScan = useCallback(async (code: string) => {
    setError('')

    try {
      setBarcodeResult(await findBarcodeLookup(code))
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }, [])

  const loadData = useCallback(async () => {
    setError('')
    try {
      const today = todayISODate()
      const [registryRows, sessionRows, cashRows, stockRows, salesTotal, monthSales] = await Promise.all([
        loadProductRegistries(),
        getTodayCashSession(),
        listTodayCashMovements(),
        listStockMovements(),
        getTodaySalesTotal(today),
        getMonthSalesTotal(today),
      ])
      setRegistries(registryRows)
      setCashSession(sessionRows)
      setCashMovements(cashRows)
      setStockMovements(stockRows)
      setSalesTodayTotal(salesTotal)
      setMonthSalesTotal(monthSales)
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      try {
        const today = todayISODate()
        const [registryRows, sessionRows, cashRows, stockRows, salesTotal, monthSales] = await Promise.all([
          loadProductRegistries(),
          getTodayCashSession(),
          listTodayCashMovements(),
          listStockMovements(),
          getTodaySalesTotal(today),
          getMonthSalesTotal(today),
        ])
        if (active) {
          setRegistries(registryRows)
          setCashSession(sessionRows)
          setCashMovements(cashRows)
          setStockMovements(stockRows)
          setSalesTodayTotal(salesTotal)
          setMonthSalesTotal(monthSales)
        }
      } catch (err) {
        if (active) {
          setError(friendlyCatalogError(err))
        }
      }
    }

    void loadInitial()

    function handleRefresh() {
      void loadData()
    }

    window.addEventListener('focus', handleRefresh)
    document.addEventListener('visibilitychange', handleRefresh)

    return () => {
      active = false
      window.removeEventListener('focus', handleRefresh)
      document.removeEventListener('visibilitychange', handleRefresh)
    }
  }, [loadData])

  async function handleProductSubmit(values: ProductFormValues, mode: ProductSubmitMode) {
    const payload: ProductInput = {
      name: values.name,
      barcode: values.barcode,
      brand_id: values.brand_id,
      clothing_type_id: values.clothing_type_id,
      family: values.family,
      size_id: values.size_id,
      color_id: values.color_id,
      reference: values.reference,
      cost_price: Number(values.cost_price || 0),
      sale_price: Number(values.sale_price),
      suggested_price: values.suggested_price === '' ? 0 : Number(values.suggested_price),
      stock_quantity: Number(values.stock_quantity),
      min_stock: Number(values.min_stock),
      description: values.description,
      active: values.active,
    }

    setSubmitting(true)
    setError('')

    try {
      await createProduct(payload, user)
      await loadData()

      if (mode === 'close') {
        setProductModalOpen(false)
        setProductBarcodePrefill('')
      }

      return true
    } catch (err) {
      setError(friendlyCatalogError(err))
      return false
    } finally {
      setSubmitting(false)
    }
  }

  async function handleQuickCreate(kind: RegistryKind, values: RegistryInput) {
    const item = await createRegistryItem(kind, values)
    await loadData()
    return item
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(135deg,#050505_0%,#151515_45%,#0b0b0b_100%)] px-6 py-8 text-white shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div className="max-w-3xl text-left">
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
            Central da loja
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            Acompanhe vendas, estoque e movimentações.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Adicionar produto"
          description="Cadastre uma nova peça no estoque"
          icon={<PackagePlus className="h-6 w-6" />}
          appearance="classic"
          onClick={() => {
            setProductBarcodePrefill('')
            setProductModalOpen(true)
          }}
        />
        <ActionCard
          title="Atualizar estoque"
          description="Registre entrada, saída ou ajuste"
          icon={<Boxes className="h-6 w-6" />}
          appearance="classic"
          onClick={() => navigate('/estoque')}
        />
        <ActionCard
          title="Ler código de barras"
          description="Consultar produto pelo código"
          icon={<Barcode className="h-6 w-6" />}
          appearance="classic"
          onClick={() => openScanner()}
        />
        <ActionCard
          title="Realizar venda"
          description="Abra o caixa e registre uma nova venda"
          icon={<ShoppingCart className="h-6 w-6" />}
          appearance="classic"
          onClick={() => navigate('/caixa?acao=nova-venda')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Vendas de hoje" value={formatCurrency(salesTodayTotal)} icon={<Receipt className="h-5 w-5" />} tone="dark" />
        <SummaryCard label="Saldo do caixa" value={formatCurrency(balanceToday)} icon={<Wallet className="h-5 w-5" />} tone="dark" />
        <SummaryCard label="Total de vendas do mês" value={formatCurrency(monthSalesTotal)} icon={<ShoppingCart className="h-5 w-5" />} tone="dark" />
      </div>

      <Card title="Últimas movimentações" description="Resumo operacional do dia.">
        {latestMovements.length === 0 ? (
          <EmptyState title="Nenhuma movimentação hoje." />
        ) : (
          <Table
            data={latestMovements}
            columns={[
              { key: 'time', header: 'Hora', render: (row) => row.time },
              { key: 'type', header: 'Tipo', render: (row) => row.type },
              { key: 'description', header: 'Descrição', render: (row) => row.description },
              {
                key: 'value',
                header: 'Valor',
                render: (row) => (typeof row.value === 'number' ? formatCurrency(row.value) : '-'),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        open={productModalOpen}
        title=" produto"
        onClose={() => {
          setProductBarcodePrefill('')
          setProductModalOpen(false)
        }}
        size="6xl"
      >
        <ProductForm
          key={productBarcodePrefill || 'new-product'}
          registries={registries}
          submitting={submitting}
          initialBarcode={productBarcodePrefill}
          onCancel={() => {
            setProductBarcodePrefill('')
            setProductModalOpen(false)
          }}
          onSubmit={handleProductSubmit}
          onQuickCreate={handleQuickCreate}
        />
      </Modal>

      <BarcodeScanModal
        open={barcodeScannerOpen}
        value={barcodeValue}
        onValueChange={setBarcodeValue}
        onConfirm={handleBarcodeScan}
        onClose={closeScanner}
      />

      <BarcodeResultModal
        open={barcodeResult !== null}
        result={barcodeResult}
        onClose={() => setBarcodeResult(null)}
        actions={
          barcodeResult?.kind === 'found'
            ? [
                {
                  label: 'Ver produto',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    setBarcodeResult(null)
                    navigate(`/produtos?q=${encodeURIComponent(barcodeResult.code)}`)
                  },
                },
                {
                  label: 'Atualizar estoque',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    setBarcodeResult(null)
                    navigate(`/estoque?barcode=${encodeURIComponent(barcodeResult.code)}&auto=1`)
                  },
                },
                {
                  label: 'Nova venda com este produto',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    setBarcodeResult(null)
                    navigate(`/caixa?acao=nova-venda&barcode=${encodeURIComponent(barcodeResult.code)}`)
                  },
                },
                {
                  label: 'Fechar',
                  variant: 'secondary',
                  onClick: () => setBarcodeResult(null),
                },
              ]
            : [
                {
                  label: 'Cadastrar produto com este código',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    setBarcodeResult(null)
                    setProductBarcodePrefill(barcodeResult.code)
                    setProductModalOpen(true)
                  },
                },
                {
                  label: 'Fechar',
                  variant: 'secondary',
                  onClick: () => setBarcodeResult(null),
                },
              ]
        }
      />
    </div>
  )
}

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function movementDescription(movement: CashMovement) {
  if (movement.origin === 'sale') {
    const items =
      movement.sale?.sale_items?.map((item) => item.product?.product_model?.name ?? item.product?.name).filter(Boolean) ?? []
    return items.length > 0 ? items.join(', ') : movement.description
  }

  return movement.description
}

function stockMovementDescription(movement: StockMovement) {
  const productName = movement.product?.product_model?.name ?? movement.product?.name ?? 'Produto'
  const detail = movement.reason === 'venda' || movement.reason === 'venda_manual' ? 'Baixa por venda' : stockReasonLabel(movement.reason)
  const reference = movement.cash_movement?.movement_code ? ` · ${movement.cash_movement.movement_code}` : ''
  const modelReference = movement.product?.product_model?.reference
    ? ` · Ref. ${movement.product.product_model.reference}`
    : ''

  return `${detail} · ${productName}${modelReference}${reference}`
}

function stockReasonLabel(reason: StockMovement['reason']) {
  const labels: Record<StockMovement['reason'], string> = {
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

  return labels[reason]
}
