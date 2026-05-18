import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import {
  createProduct,
  deleteProduct,
  friendlyCatalogError,
  listCategories,
  listProducts,
  updateProduct,
  type ProductInput,
} from '../../lib/catalog'
import type { Category, Product } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { ProductForm, type ProductFormValues } from './ProductForm'
import { ProductTable } from './ProductTable'

export function ProductsPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [activeFilter, setActiveFilter] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const loadCategories = useCallback(async () => {
    setCategories(await listCategories())
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setProducts(
        await listProducts({
          query,
          categoryId: categoryId || undefined,
          size: size.trim() || undefined,
          color: color.trim() || undefined,
          active: activeFilter === '' ? null : activeFilter === 'active',
          lowStock,
        }),
      )
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }, [activeFilter, categoryId, color, lowStock, query, size])

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      try {
        const [categoryRows, productRows] = await Promise.all([
          listCategories(),
          listProducts({
            query,
            categoryId: categoryId || undefined,
            size: size.trim() || undefined,
            color: color.trim() || undefined,
            active: activeFilter === '' ? null : activeFilter === 'active',
            lowStock,
          }),
        ])
        if (active) {
          setCategories(categoryRows)
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
  }, [activeFilter, categoryId, color, lowStock, query, size])

  function openCreateModal() {
    setEditingProduct(null)
    setModalOpen(true)
  }

  function openEditModal(product: Product) {
    setEditingProduct(product)
    setModalOpen(true)
  }

  async function handleSubmit(values: ProductFormValues) {
    const payload: ProductInput = {
      name: values.name,
      brand: values.brand,
      reference: values.reference,
      barcode: values.barcode,
      category_id: values.category_id,
      cost_price: Number(values.cost_price || 0),
      sale_price: Number(values.sale_price),
      suggested_price: values.suggested_price === '' ? null : Number(values.suggested_price),
      stock_quantity: Number(values.stock_quantity),
      min_stock: Number(values.min_stock),
      size: values.size,
      color: values.color,
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

      setModalOpen(false)
      setEditingProduct(null)
      await Promise.all([loadCategories(), loadProducts()])
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
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
        description="Gerencie produtos, preços, tamanhos, cores e códigos de barras."
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

        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px_120px_140px_160px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, referência, código ou marca"
              value={query}
              onChange={(event) => {
                setLoading(true)
                setQuery(event.target.value)
              }}
            />
          </div>
          <select
            className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
            value={categoryId}
            onChange={(event) => {
              setLoading(true)
              setCategoryId(event.target.value)
            }}
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <Input
            placeholder="Tamanho"
            value={size}
            onChange={(event) => {
              setLoading(true)
              setSize(event.target.value)
            }}
          />
          <Input
            placeholder="Cor"
            value={color}
            onChange={(event) => {
              setLoading(true)
              setColor(event.target.value)
            }}
          />
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
      >
        <ProductForm
          key={editingProduct?.id ?? 'new-product'}
          product={editingProduct}
          categories={categories}
          submitting={submitting}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  )
}
