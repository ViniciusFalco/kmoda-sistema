import { useCallback, useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import {
  createRegistryItem,
  deleteRegistryItem,
  friendlyCatalogError,
  listRegistryItems,
  updateRegistryItem,
  type RegistryInput,
} from '../../lib/catalog'
import type { Brand, ClothingType, Color, RegistryItem, RegistryKind, Size } from '../../types/database'
import { RegistryTab } from './RegistryTab'

type TabKey = 'brands' | 'clothing_types' | 'sizes' | 'colors'

const tabs: Array<{ key: TabKey; label: string; createLabel: string }> = [
  { key: 'brands', label: 'Marcas', createLabel: 'Nova marca' },
  { key: 'clothing_types', label: 'Tipos de roupa', createLabel: 'Novo tipo' },
  { key: 'sizes', label: 'Tamanhos', createLabel: 'Novo tamanho' },
  { key: 'colors', label: 'Cores', createLabel: 'Nova cor' },
]

export function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('brands')
  const [brands, setBrands] = useState<Brand[]>([])
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [colors, setColors] = useState<Color[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const loadRegistries = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [brandRows, typeRows, sizeRows, colorRows] = await Promise.all([
        listRegistryItems('brands'),
        listRegistryItems('clothing_types'),
        listRegistryItems('sizes'),
        listRegistryItems('colors'),
      ])
      setBrands(brandRows)
      setClothingTypes(typeRows)
      setSizes(sizeRows)
      setColors(colorRows)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      try {
        const [brandRows, typeRows, sizeRows, colorRows] = await Promise.all([
          listRegistryItems('brands'),
          listRegistryItems('clothing_types'),
          listRegistryItems('sizes'),
          listRegistryItems('colors'),
        ])
        if (active) {
          setBrands(brandRows)
          setClothingTypes(typeRows)
          setSizes(sizeRows)
          setColors(colorRows)
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

    void loadInitial()

    return () => {
      active = false
    }
  }, [])

  async function handleCreate(kind: RegistryKind, values: RegistryInput) {
    setSubmitting(true)
    setError('')

    try {
      await createRegistryItem(kind, values)
      await loadRegistries()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(kind: RegistryKind, id: string, values: RegistryInput) {
    setSubmitting(true)
    setError('')

    try {
      await updateRegistryItem(kind, id, values)
      await loadRegistries()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(kind: RegistryKind, item: RegistryItem) {
    const confirmed = window.confirm(`Excluir "${item.name}"?`)
    if (!confirmed) {
      return
    }

    setError('')

    try {
      await deleteRegistryItem(kind, item.id)
      await loadRegistries()
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }

  const activeConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0]

  return (
    <Card title="Cadastros" description="Marcas, tipos, tamanhos e cores usados no cadastro rápido de produtos.">
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-100 pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'border-gray-300 bg-white text-gray-950 shadow-sm'
                : 'border-transparent text-gray-600 hover:border-gray-200 hover:bg-gray-50 hover:text-gray-950'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'brands' ? (
        <RegistryTab
          kind="brands"
          title={activeConfig.label}
          createLabel={activeConfig.createLabel}
          items={brands}
          loading={loading}
          submitting={submitting}
          error={error}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ) : activeTab === 'clothing_types' ? (
        <RegistryTab
          kind="clothing_types"
          title={activeConfig.label}
          createLabel={activeConfig.createLabel}
          items={clothingTypes}
          loading={loading}
          submitting={submitting}
          error={error}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ) : activeTab === 'sizes' ? (
        <RegistryTab
          kind="sizes"
          title={activeConfig.label}
          createLabel={activeConfig.createLabel}
          items={sizes}
          loading={loading}
          submitting={submitting}
          error={error}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ) : (
        <RegistryTab
          kind="colors"
          title={activeConfig.label}
          createLabel={activeConfig.createLabel}
          items={colors}
          loading={loading}
          submitting={submitting}
          error={error}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </Card>
  )
}
