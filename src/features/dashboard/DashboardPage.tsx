import { Boxes, ChevronDown, ChevronUp, PackagePlus, Receipt, ShoppingCart, Users, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionCard } from '../../components/ui/ActionCard'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { Table } from '../../components/ui/Table'
import { useSensitiveValuesHidden } from '../../hooks/useAppSettings'
import {
  friendlyCatalogError,
  getMonthSalesTotal,
  getTodayCashSession,
  getTodaySalesTotal,
  listCustomers,
  listProducts,
  listStockMovements,
  listTodayCashMovements,
  loadProductRegistries,
} from '../../lib/catalog'
import { formatCurrency, formatDateBR, todayISODate } from '../../lib/utils'
import type {
  Brand,
  CashMovement,
  CashSession,
  ClothingType,
  Color,
  Customer,
  Product,
  Size,
  StockMovement,
} from '../../types/database'

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
  source: string
  type: string
  description: string
  detail: string
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [sensitiveValuesHidden] = useSensitiveValuesHidden()
  const [latestMovementsOpen, setLatestMovementsOpen] = useState(false)
  const [registries, setRegistries] = useState<ProductRegistries>(emptyRegistries)
  const [cashSession, setCashSession] = useState<CashSession | null>(null)
  const [cashMovements, setCashMovements] = useState<CashMovement[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [salesTodayTotal, setSalesTodayTotal] = useState(0)
  const [monthSalesTotal, setMonthSalesTotal] = useState(0)
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
      source: 'Caixa',
      type:
        movement.type === 'income'
          ? movement.origin === 'sale'
            ? 'Venda'
            : movement.origin === 'promissory'
              ? 'Promissória'
              : 'Entrada'
          : 'Despesa',
      description: movementDescription(movement),
      detail:
        movement.type === 'expense'
          ? `Saída de ${formatCurrency(movement.amount)}`
          : `Entrada de ${formatCurrency(movement.amount)}`,
    }))

    const stockRows = stockMovements.map((movement) => ({
      id: `stock-${movement.id}`,
      createdAt: movement.created_at,
      time: formatTime(movement.created_at),
      source: 'Estoque',
      type: movement.type === 'entrada' ? 'Entrada' : 'Saída',
      description: getStockMovementTitle(movement),
      detail: stockMovementDescription(movement),
    }))

    const productRows = products.flatMap((product) => {
      const description = product.product_model?.name ?? product.name
      const detail = product.barcode ? `Código ${product.barcode}` : `Ref. ${product.reference ?? product.product_model?.reference ?? '-'}`
      const createdRow = {
        id: `product-create-${product.id}`,
        createdAt: product.created_at,
        time: formatTime(product.created_at),
        source: 'Produtos',
        type: 'Cadastro',
        description,
        detail,
      }

      if (product.updated_at !== product.created_at) {
        return [
          createdRow,
          {
            id: `product-update-${product.id}`,
            createdAt: product.updated_at,
            time: formatTime(product.updated_at),
            source: 'Produtos',
            type: 'Atualização',
            description,
            detail,
          },
        ]
      }

      return [createdRow]
    })

    const customerRows = customers.flatMap((customer) => {
      const detail = [customer.email, customer.phone].filter(Boolean).join(' • ') || customer.cpf || 'Cadastro básico'
      const createdRow = {
        id: `customer-create-${customer.id}`,
        createdAt: customer.created_at,
        time: formatTime(customer.created_at),
        source: 'Clientes',
        type: 'Cadastro',
        description: customer.name,
        detail,
      }

      if (customer.updated_at !== customer.created_at) {
        return [
          createdRow,
          {
            id: `customer-update-${customer.id}`,
            createdAt: customer.updated_at,
            time: formatTime(customer.updated_at),
            source: 'Clientes',
            type: 'Atualização',
            description: customer.name,
            detail,
          },
        ]
      }

      return [createdRow]
    })

    const registryRows = [
      ...registries.brands.flatMap((item) => buildRegistryRows('Marca', item.name, item.created_at, item.updated_at, item.active ? 'Ativa' : 'Inativa')),
      ...registries.clothingTypes.flatMap((item) =>
        buildRegistryRows('Tipo', item.name, item.created_at, item.updated_at, item.active ? 'Ativo' : 'Inativo'),
      ),
      ...registries.sizes.flatMap((item) => buildRegistryRows('Tamanho', item.name, item.created_at, item.updated_at, item.active ? 'Ativo' : 'Inativo')),
      ...registries.colors.flatMap((item) => buildRegistryRows('Cor', item.name, item.created_at, item.updated_at, item.active ? 'Ativa' : 'Inativa')),
    ]

    return [...cashRows, ...stockRows, ...productRows, ...customerRows, ...registryRows]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
  }, [cashMovements, customers, products, registries.brands, registries.clothingTypes, registries.colors, registries.sizes, stockMovements])

  const loadData = useCallback(async () => {
    setError('')
    try {
      const today = todayISODate()
      const [registryRows, sessionRows, cashRows, stockRows, productRows, customerRows, salesTotal, monthSales] = await Promise.all([
        loadProductRegistries(),
        getTodayCashSession(),
        listTodayCashMovements(),
        listStockMovements(),
        listProducts(),
        listCustomers(),
        getTodaySalesTotal(today),
        getMonthSalesTotal(today),
      ])
      setRegistries(registryRows)
      setCashSession(sessionRows)
      setCashMovements(cashRows)
      setStockMovements(stockRows)
      setProducts(productRows)
      setCustomers(customerRows)
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
        const [registryRows, sessionRows, cashRows, stockRows, productRows, customerRows, salesTotal, monthSales] = await Promise.all([
          loadProductRegistries(),
          getTodayCashSession(),
          listTodayCashMovements(),
          listStockMovements(),
          listProducts(),
          listCustomers(),
          getTodaySalesTotal(today),
          getMonthSalesTotal(today),
        ])
        if (active) {
          setRegistries(registryRows)
          setCashSession(sessionRows)
          setCashMovements(cashRows)
          setStockMovements(stockRows)
          setProducts(productRows)
          setCustomers(customerRows)
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

  return (
    <div className="space-y-5">
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          compact
          title="Adicionar produto"
          description="Cadastre uma nova peça no estoque"
          icon={<PackagePlus className="h-6 w-6" />}
          appearance="classic"
          onClick={() => navigate('/produtos?create=1')}
        />
        <ActionCard
          compact
          title="Atualizar estoque"
          description="Registre entrada, saída ou ajuste"
          icon={<Boxes className="h-6 w-6" />}
          appearance="classic"
          onClick={() => navigate('/estoque')}
        />
        <ActionCard
          compact
          title="Clientes"
          description="Consultar cadastros e contatos"
          icon={<Users className="h-6 w-6" />}
          appearance="classic"
          onClick={() => navigate('/clientes')}
        />
        <ActionCard
          compact
          title="Realizar venda"
          description="Abra o caixa e registre uma nova venda"
          icon={<ShoppingCart className="h-6 w-6" />}
          appearance="classic"
          onClick={() => navigate('/caixa?acao=nova-venda')}
        />
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard
          label="Vendas de hoje"
          value={formatCurrency(salesTodayTotal)}
          icon={<Receipt className="h-5 w-5" />}
          blurred={sensitiveValuesHidden}
        />
        <SummaryCard
          label="Saldo do caixa"
          value={formatCurrency(balanceToday)}
          icon={<Wallet className="h-5 w-5" />}
          blurred={sensitiveValuesHidden}
        />
        <SummaryCard
          label="Total de vendas do mês"
          value={formatCurrency(monthSalesTotal)}
          icon={<ShoppingCart className="h-5 w-5" />}
          blurred={sensitiveValuesHidden}
        />
      </div>

      <Card className="p-0 sm:p-0">
        <div className="flex flex-col gap-3 border-b-2 border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-950 sm:text-base">Últimas movimentações</h2>
            <p className="mt-1 text-xs text-gray-500">
              {latestMovements.length === 0
                ? 'Nenhum registro recente.'
                : `${latestMovements.length} ${latestMovements.length === 1 ? 'registro recente' : 'registros recentes'}`}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setLatestMovementsOpen((current) => !current)}
            aria-expanded={latestMovementsOpen}
            className="shrink-0 border-gray-300 bg-white text-gray-800 hover:border-gray-900 hover:text-gray-950"
          >
            {latestMovementsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {latestMovementsOpen ? 'Ocultar' : 'Mostrar'}
          </Button>
        </div>

        {latestMovementsOpen ? (
          <div className="p-4 sm:p-5">
            {latestMovements.length === 0 ? (
              <EmptyState title="Nenhuma movimentação hoje." />
            ) : (
              <Table
                headerClassName="bg-black text-white"
                data={latestMovements}
                columns={[
                  {
                    key: 'time',
                    header: 'Data e Hora',
                    render: (row) => `${formatDateBR(row.createdAt)} às ${row.time}`,
                  },
                  { key: 'source', header: 'Fonte', render: (row) => row.source },
                  { key: 'type', header: 'Evento', render: (row) => row.type },
                  { key: 'description', header: 'Descrição', render: (row) => row.description },
                  { key: 'detail', header: 'Detalhe', render: (row) => row.detail },
                ]}
              />
            )}
          </div>
        ) : null}
      </Card>

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

function getStockMovementTitle(movement: StockMovement) {
  return movement.product?.product_model?.name ?? movement.product?.name ?? 'Movimentação'
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

function buildRegistryRows(
  kindLabel: string,
  name: string,
  createdAt: string,
  updatedAt: string,
  statusLabel: string,
) {
  const description = name
  const detail = `${kindLabel} ${statusLabel.toLowerCase()}`
  const createdRow = {
    id: `registry-create-${kindLabel}-${name}-${createdAt}`,
    createdAt,
    time: formatTime(createdAt),
    source: 'Cadastros',
    type: 'Cadastro',
    description,
    detail,
  }

  if (updatedAt !== createdAt) {
    return [
      createdRow,
      {
        id: `registry-update-${kindLabel}-${name}-${updatedAt}`,
        createdAt: updatedAt,
        time: formatTime(updatedAt),
        source: 'Cadastros',
        type: 'Atualização',
        description,
        detail,
      },
    ]
  }

  return [createdRow]
}
