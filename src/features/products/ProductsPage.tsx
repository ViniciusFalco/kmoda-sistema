import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  createProduct,
  createRegistryItem,
  deleteProduct,
  friendlyCatalogError,
  listProducts,
  loadProductRegistries,
  updateProduct,
  type ProductInput,
  type RegistryInput,
} from '../../lib/catalog'
import type { Brand, ClothingType, Color, Product, RegistryKind, Size } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { ProductForm, type ProductFormValues, type ProductSubmitMode } from './ProductForm'
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

  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setQuery(q)
  }, [searchParams])

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
    setModalOpen(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setModalOpen(true)
  }

  async function handleSubmit(values: ProductFormValues, mode: ProductSubmitMode) {
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
      if (editingProduct) {
        await updateProduct(editingProduct.id, payload)
      } else {
        await createProduct(payload, user)
      }

      if (mode === 'close') {
        setModalOpen(false)
        setEditingProduct(null)
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
    <div className="space-y-6">
      <Card
        title="Produtos"
        description="Cadastro rápido de peças por etiqueta, código de barras e atributos da roupa."
        action={
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Adicionar produto
          </Button>
        }
      >
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-4 grid gap-3 xl:grid-cols-[1fr_160px_180px_130px_150px_150px_auto]">
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
          <FilterSelect value={brandId} onChange={setBrandId} label="Todas as marcas" items={registries.brands} />
          <FilterSelect
            value={clothingTypeId}
            onChange={setClothingTypeId}
            label="Todos os tipos"
            items={registries.clothingTypes}
          />
          <FilterSelect value={sizeId} onChange={setSizeId} label="Tamanhos" items={registries.sizes} />
          <FilterSelect value={colorId} onChange={setColorId} label="Cores" items={registries.colors} />
          <select
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
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
          <label className="flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(event) => {
                setLoading(true)
                setLowStock(event.target.checked)
              }}
              className="h-4 w-4 rounded border-gray-300"
            />
            Baixo
          </label>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Carregando produtos...
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="Nenhum produto encontrado."
            description="Cadastre um produto ou ajuste os filtros da busca."
            action={<Button onClick={openCreateModal}>Adicionar produto</Button>}
          />
        ) : (
          <ProductTable products={products} onEdit={openEditModal} onDelete={(product) => void handleDelete(product)} />
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editingProduct ? 'Editar produto' : 'Adicionar produto'}
        onClose={() => setModalOpen(false)}
        size="6xl"
      >
        <ProductForm
          key={editingProduct?.id ?? 'new-product'}
          product={editingProduct}
          registries={registries}
          submitting={submitting}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          onQuickCreate={handleQuickCreate}
        />
      </Modal>
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
      className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
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
