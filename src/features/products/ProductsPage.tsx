import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarcodeResultModal, type BarcodeLookupResult } from '../../components/barcode/BarcodeResultModal'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  createProduct,
  createRegistryItem,
  deleteProduct,
  findBarcodeLookup,
  friendlyCatalogError,
  listProducts,
  loadProductRegistries,
  updateProduct,
  type ProductInput,
  type RegistryInput,
} from '../../lib/catalog'
import { parseCurrencyToNumber } from '../../lib/utils'
import type { Brand, ClothingType, Color, Product, RegistryKind, Size } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import {
  ProductEditorForm,
  type ProductEditorFormValues,
  type ProductEditorSubmitMode,
} from './ProductEditorForm'
import { ProductTable } from './ProductTable'

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

export function ProductsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [registries, setRegistries] = useState<ProductRegistries>(emptyRegistries)
  const [query, setQuery] = useState('')
  const [brandId, setBrandId] = useState('')
  const [clothingTypeId, setClothingTypeId] = useState('')
  const [sizeId, setSizeId] = useState('')
  const [colorId, setColorId] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [initialBarcode, setInitialBarcode] = useState('')
  const [barcodeResult, setBarcodeResult] = useState<BarcodeLookupResult | null>(null)

  const createBarcodeParam = searchParams.get('barcode') ?? ''
  const shouldOpenCreate = searchParams.get('create') === '1'

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(q)
  }, [searchParams])

  useEffect(() => {
    if (!shouldOpenCreate) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditingProduct(null)
    setInitialBarcode(createBarcodeParam)
    setModalOpen(true)
  }, [createBarcodeParam, shouldOpenCreate])

  const filters = useMemo(
    () => ({
      query,
      brandId: brandId || undefined,
      clothingTypeId: clothingTypeId || undefined,
      sizeId: sizeId || undefined,
      colorId: colorId || undefined,
      active: activeFilter === '' ? null : activeFilter === 'active',
      lowStock,
    }),
    [activeFilter, brandId, clothingTypeId, colorId, lowStock, query, sizeId],
  )

  const loadRegistries = useCallback(async () => {
    setRegistries(await loadProductRegistries())
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setProducts(await listProducts(filters))
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      try {
        const [registryRows, productRows] = await Promise.all([
          loadProductRegistries(),
          listProducts(filters),
        ])
        if (active) {
          setRegistries(registryRows)
          setProducts(productRows)
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(friendlyCatalogError(err))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      active = false
    }
  }, [filters])

  function openCreateModal() {
    setEditingProduct(null)
    setInitialBarcode('')
    setModalOpen(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setInitialBarcode('')
    setModalOpen(true)
  }

  const handleBarcodeScan = useCallback(async (code: string) => {
    setError('')

    try {
      setBarcodeResult(await findBarcodeLookup(code))
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }, [])

  function closeModal() {
    setModalOpen(false)
    setEditingProduct(null)
    setInitialBarcode('')
  }

  async function handleSubmit(values: ProductEditorFormValues, mode: ProductEditorSubmitMode) {
    const payload: ProductInput = {
      name: values.name,
      barcode: values.barcode,
      brand_id: values.brand_id,
      clothing_type_id: values.clothing_type_id,
      family: values.family,
      size_id: values.size_id,
      color_id: values.color_id,
      reference: values.reference,
      cost_price: parseCurrencyToNumber(values.cost_price),
      sale_price: parseCurrencyToNumber(values.sale_price),
      suggested_price: values.suggested_price === '' ? 0 : Number(values.suggested_price),
      stock_quantity: Number(values.stock_quantity),
      min_stock: Number(values.min_stock),
      description: values.description,
      active: values.active,
    }

    setSubmitting(true)
    setError('')

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
      } else {
        await createProduct(payload, user)
      }

      if (mode === 'close') {
        closeModal()
      }

      await Promise.all([loadRegistries(), loadProducts()])
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
    await loadRegistries()
    return item
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(`Excluir o produto "${product.name}"?`)
    if (!confirmed) {
      return
    }

    setError('')

    try {
      await deleteProduct(product.id)
      await loadProducts()
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <BarcodeScanButton label="Ler código" variant="secondary" tone="light" onScan={handleBarcodeScan} />
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Adicionar produto
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="border-b-2 border-gray-100 px-5 py-4 text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-500">
            Filtros
          </p>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 xl:grid-cols-[1.15fr_160px_180px_130px_150px_150px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, código, marca, tipo, cor ou tamanho"
                value={query}
                onChange={(event) => {
                  setLoading(true)
                  setQuery(event.target.value)
                }}
              />
            </div>
            <FilterSelect
              value={brandId}
              onChange={setBrandId}
              label="Todas as marcas"
              items={registries.brands}
            />
            <FilterSelect
              value={clothingTypeId}
              onChange={setClothingTypeId}
              label="Todos os tipos"
              items={registries.clothingTypes}
            />
            <FilterSelect value={sizeId} onChange={setSizeId} label="Tamanhos" items={registries.sizes} />
            <FilterSelect value={colorId} onChange={setColorId} label="Cores" items={registries.colors} />
            <select
              className="h-9 rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              value={activeFilter}
              onChange={(event) => {
                setLoading(true)
                setActiveFilter(event.target.value)
              }}
            >
              <option value="">Todos os status</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <label className="flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={lowStock}
                onChange={(event) => {
                  setLoading(true)
                  setLowStock(event.target.checked)
                }}
                className="h-4 w-4 rounded border-gray-300 accent-gray-900"
              />
              Baixo
            </label>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Carregando produtos...</div>
        ) : products.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nenhum produto encontrado."
              description="Cadastre um produto ou ajuste os filtros da busca."
              action={<Button onClick={openCreateModal}>Adicionar produto</Button>}
            />
          </div>
        ) : (
          <ProductTable products={products} onEdit={openEditModal} onDelete={(product) => void handleDelete(product)} />
        )}
      </section>

      <Modal
        open={modalOpen}
        title={editingProduct ? 'Editar produto' : 'Adicionar produto'}
        onClose={closeModal}
        fullScreen
        bodyClassName="p-0"
      >
        <ProductEditorForm
          key={editingProduct?.id ?? (initialBarcode || 'new-product')}
          product={editingProduct}
          registries={registries}
          submitting={submitting}
          initialBarcode={initialBarcode}
          onCancel={closeModal}
          onSubmit={handleSubmit}
          onQuickCreate={handleQuickCreate}
        />
      </Modal>

      <BarcodeResultModal
        open={barcodeResult !== null}
        result={barcodeResult}
        onClose={() => setBarcodeResult(null)}
        actions={
          barcodeResult?.kind === 'found'
            ? [
                {
                  label: 'Editar produto',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    setBarcodeResult(null)
                    setEditingProduct(barcodeResult.product)
                    setInitialBarcode('')
                    setModalOpen(true)
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
                  label: 'Fechar',
                  variant: 'secondary',
                  onClick: () => setBarcodeResult(null),
                },
              ]
            : [
                {
                  label: 'Cadastrar este código',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    setBarcodeResult(null)
                    setEditingProduct(null)
                    setInitialBarcode(barcodeResult.code)
                    setModalOpen(true)
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

function FilterSelect({
  value,
  onChange,
  label,
  items,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  items: Array<{ id: string; name: string }>
}) {
  return (
    <select
      className="h-9 rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{label}</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  )
}
