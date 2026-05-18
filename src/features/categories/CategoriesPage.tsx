import { Edit, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import {
  createCategory,
  deleteCategory,
  friendlyCatalogError,
  listCategories,
  updateCategory,
} from '../../lib/catalog'
import type { Category } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { CategoryForm, type CategoryFormValues } from './CategoryForm'

export function CategoriesPage() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setCategories(await listCategories())
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadInitialCategories() {
      try {
        const rows = await listCategories()
        if (active) {
          setCategories(rows)
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

    void loadInitialCategories()

    return () => {
      active = false
    }
  }, [])

  function openCreateModal() {
    setEditingCategory(null)
    setModalOpen(true)
  }

  function openEditModal(category: Category) {
    setEditingCategory(category)
    setModalOpen(true)
  }

  async function handleSubmit(values: CategoryFormValues) {
    setSubmitting(true)
    setError('')

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values)
      } else {
        await createCategory(values, user)
      }

      setModalOpen(false)
      setEditingCategory(null)
      await loadCategories()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(`Excluir a categoria "${category.name}"?`)
    if (!confirmed) {
      return
    }

    setError('')

    try {
      await deleteCategory(category.id)
      await loadCategories()
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }

  return (
    <Card
      title="Categorias"
      description="Organize produtos e prepare relacionamentos no Supabase."
      action={
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Button>
      }
    >
      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Carregando categorias...
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="Nenhuma categoria cadastrada."
          description="Crie a primeira categoria para organizar os produtos da loja."
          action={<Button onClick={openCreateModal}>Nova categoria</Button>}
        />
      ) : (
        <Table
          data={categories}
          columns={[
            { key: 'name', header: 'Nome', render: (category) => category.name },
            { key: 'description', header: 'Descrição', render: (category) => category.description ?? '-' },
            {
              key: 'actions',
              header: 'Ações',
              render: (category) => (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label="Editar categoria"
                    onClick={() => openEditModal(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Excluir categoria"
                    onClick={() => void handleDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={modalOpen}
        title={editingCategory ? 'Editar categoria' : 'Nova categoria'}
        onClose={() => setModalOpen(false)}
      >
        <CategoryForm
          key={editingCategory?.id ?? 'new-category'}
          category={editingCategory}
          submitting={submitting}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </Card>
  )
}
