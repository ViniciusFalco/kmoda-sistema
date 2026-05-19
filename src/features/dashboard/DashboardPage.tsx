import { Barcode, Boxes, PackagePlus, Receipt, ShoppingCart, Truck, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActionCard } from '../../components/ui/ActionCard'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { Table } from '../../components/ui/Table'
import {
  createProduct,
  createRegistryItem,
  friendlyCatalogError,
  listProducts,
  loadProductRegistries,
  type ProductInput,
  type RegistryInput,
} from '../../lib/catalog'
import { formatCurrency } from '../../lib/utils'
import type { Brand, ClothingType, Color, Product, RegistryKind, Size } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
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

const latestMovements = [
  { id: '1', time: '09:30', type: 'Venda', description: 'Venda balcão', value: 238.9 },
  { id: '2', time: '10:10', type: 'Estoque', description: 'Entrada de produto', value: 0 },
  { id: '3', time: '11:05', type: 'Caixa', description: 'Saída operacional', value: -80 },
]

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false)
  const [registries, setRegistries] = useState<ProductRegistries>(emptyRegistries)
  const [products, setProducts] = useState<Product[]>([])
  const [barcodeQuery, setBarcodeQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock_quantity <= product.min_stock).length,
    [products],
  )

  const barcodeResult = useMemo(() => {
    const normalized = barcodeQuery.trim().toLowerCase()
    if (!normalized) {
      return null
    }

    return (
      products.find((product) => product.barcode?.toLowerCase() === normalized) ??
      products.find((product) => product.name.toLowerCase().includes(normalized)) ??
      null
    )
  }, [barcodeQuery, products])

  const loadData = useCallback(async () => {
    try {
      const [registryRows, productRows] = await Promise.all([
        loadProductRegistries(),
        listProducts({ active: true }),
      ])
      setRegistries(registryRows)
      setProducts(productRows)
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      try {
        const [registryRows, productRows] = await Promise.all([
          loadProductRegistries(),
          listProducts({ active: true }),
        ])
        if (active) {
          setRegistries(registryRows)
          setProducts(productRows)
        }
      } catch (err) {
        if (active) {
          setError(friendlyCatalogError(err))
        }
      }
    }

    void loadInitial()

    return () => {
      active = false
    }
  }, [])

  async function handleProductSubmit(values: ProductFormValues, mode: ProductSubmitMode) {
    const payload: ProductInput = {
      name: values.name,
      barcode: values.barcode,
      brand_id: values.brand_id,
      clothing_type_id: values.clothing_type_id,
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
      <div>
        <h1 className="text-3xl font-semibold text-gray-950">Central da loja</h1>
        <p className="mt-2 text-gray-500">Escolha uma ação para começar.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Adicionar produto"
          description="Cadastre uma nova peça no estoque"
          icon={<PackagePlus className="h-6 w-6" />}
          onClick={() => setProductModalOpen(true)}
        />
        <ActionCard
          title="Atualizar estoque"
          description="Registre entrada, saída ou ajuste"
          icon={<Boxes className="h-6 w-6" />}
          onClick={() => navigate('/estoque')}
        />
        <ActionCard
          title="Ler código de barras"
          description="Consultar produto pelo código"
          icon={<Barcode className="h-6 w-6" />}
          onClick={() => setBarcodeModalOpen(true)}
        />
        <ActionCard
          title="Realizar venda"
          description="Monte uma venda e dê baixa no estoque"
          icon={<ShoppingCart className="h-6 w-6" />}
          onClick={() => navigate('/vendas')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Vendas de hoje" value={formatCurrency(0)} icon={<Receipt className="h-5 w-5" />} />
        <SummaryCard label="Saldo do caixa" value={formatCurrency(0)} icon={<Wallet className="h-5 w-5" />} />
        <SummaryCard label="Estoque baixo" value={String(lowStockCount)} icon={<Boxes className="h-5 w-5" />} />
        <SummaryCard label="Encomendas pendentes" value="2" icon={<Truck className="h-5 w-5" />} />
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
              { key: 'value', header: 'Valor', render: (row) => (row.value ? formatCurrency(row.value) : '-') },
            ]}
          />
        )}
      </Card>

      <Modal open={productModalOpen} title="Adicionar produto" onClose={() => setProductModalOpen(false)} size="6xl">
        <ProductForm
          registries={registries}
          submitting={submitting}
          onCancel={() => setProductModalOpen(false)}
          onSubmit={handleProductSubmit}
          onQuickCreate={handleQuickCreate}
        />
      </Modal>

      <Modal
        open={barcodeModalOpen}
        title="Ler código de barras"
        onClose={() => setBarcodeModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Leitor ainda será configurado. Por enquanto, digite o código manualmente para consultar.
          </div>
          <Input
            label="Código de barras"
            inputMode="text"
            value={barcodeQuery}
            autoFocus
            onChange={(event) => setBarcodeQuery(event.target.value)}
          />
          {barcodeQuery.trim() ? (
            barcodeResult ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="font-semibold text-gray-950">{barcodeResult.name}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {[barcodeResult.brand?.name, barcodeResult.clothing_type?.name, barcodeResult.size?.name, barcodeResult.color?.name]
                    .filter(Boolean)
                    .join(' • ') || 'Produto cadastrado'}
                </p>
                <p className="mt-3 text-sm font-medium text-gray-900">
                  Estoque: {barcodeResult.stock_quantity} · Venda: {formatCurrency(barcodeResult.sale_price)}
                </p>
              </div>
            ) : (
              <EmptyState title="Produto não encontrado." description="Confira o código digitado ou cadastre o produto." />
            )
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
