import { Edit, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import type { RegistryInput } from '../../lib/catalog'
import type { Color, RegistryItem, RegistryKind, Size } from '../../types/database'

interface RegistryTabProps<T extends RegistryItem> {
  kind: RegistryKind
  title: string
  createLabel: string
  items: T[]
  loading: boolean
  submitting: boolean
  error: string
  onCreate: (kind: RegistryKind, values: RegistryInput) => Promise<void>
  onUpdate: (kind: RegistryKind, id: string, values: RegistryInput) => Promise<void>
  onDelete: (kind: RegistryKind, item: T) => Promise<void>
}

export function RegistryTab<T extends RegistryItem>({
  kind,
  title,
  createLabel,
  items,
  loading,
  submitting,
  error,
  onCreate,
  onUpdate,
  onDelete,
}: RegistryTabProps<T>) {
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return items
    }

    return items.filter((item) => item.name.toLowerCase().includes(normalized))
  }, [items, query])

  function openCreateModal() {
    setEditingItem(null)
    setModalOpen(true)
  }

  function openEditModal(item: T) {
    setEditingItem(item)
    setModalOpen(true)
  }

  async function handleSubmit(values: RegistryInput) {
    if (editingItem) {
      await onUpdate(kind, editingItem.id, values)
    } else {
      await onCreate(kind, values)
    }

    setModalOpen(false)
    setEditingItem(null)
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input
          placeholder={`Buscar em ${title.toLowerCase()}`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          {createLabel}
        </Button>
      </div>

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Carregando {title.toLowerCase()}...
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title={`Nenhum item em ${title.toLowerCase()}.`}
          description="Cadastre o primeiro item para agilizar o cadastro de produtos."
          action={<Button onClick={openCreateModal}>{createLabel}</Button>}
        />
      ) : (
        <Table
          data={filteredItems}
          columns={[
            { key: 'name', header: 'Nome', render: (item) => item.name },
            {
              key: 'extra',
              header: kind === 'sizes' ? 'Ordem' : kind === 'colors' ? 'Cor' : 'Descrição',
              render: (item) => renderExtra(kind, item),
            },
            {
              key: 'active',
              header: 'Status',
              render: (item) => (item.active ? 'Ativo' : 'Inativo'),
            },
            {
              key: 'actions',
              header: 'Ações',
              render: (item) => (
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => openEditModal(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void onDelete(kind, item)}>
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
        title={editingItem ? `Editar ${singularTitle(title)}` : createLabel}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <RegistryItemForm
          key={editingItem?.id ?? `new-${kind}`}
          kind={kind}
          item={editingItem}
          submitting={submitting}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  )
}

interface RegistryItemFormProps {
  kind: RegistryKind
  item: RegistryItem | null
  submitting: boolean
  onCancel: () => void
  onSubmit: (values: RegistryInput) => Promise<void>
}

function RegistryItemForm({ kind, item, submitting, onCancel, onSubmit }: RegistryItemFormProps) {
  const size = item && kind === 'sizes' ? (item as Size) : null
  const color = item && kind === 'colors' ? (item as Color) : null
  const descriptionItem =
    item && (kind === 'brands' || kind === 'clothing_types')
      ? (item as { description?: string | null })
      : null
  const [name, setName] = useState(item?.name ?? '')
  const [description, setDescription] = useState(descriptionItem?.description ?? '')
  const [sortOrder, setSortOrder] = useState(size?.sort_order?.toString() ?? '')
  const [hex, setHex] = useState(color?.hex ?? '')
  const [active, setActive] = useState(item?.active ?? true)
  const [nameError, setNameError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError('Informe o nome.')
      return
    }

    await onSubmit({
      name,
      description,
      sort_order: sortOrder === '' ? null : Number(sortOrder),
      hex,
      active,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        label="Nome"
        value={name}
        autoFocus
        onChange={(event) => {
          setName(event.target.value)
          setNameError('')
        }}
        error={nameError}
      />
      {kind === 'sizes' ? (
        <Input
          label="Ordem"
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
        />
      ) : kind === 'colors' ? (
        <Input label="Hex" placeholder="#000000" value={hex} onChange={(event) => setHex(event.target.value)} />
      ) : (
        <Input
          label="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      )}
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        Ativo
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}

function renderExtra(kind: RegistryKind, item: RegistryItem) {
  if (kind === 'sizes') {
    return (item as Size).sort_order ?? '-'
  }

  if (kind === 'colors') {
    const color = item as Color
    return color.hex ? (
      <span className="inline-flex items-center gap-2">
        <span className="h-4 w-4 rounded border border-gray-200" style={{ backgroundColor: color.hex }} />
        {color.hex}
      </span>
    ) : (
      '-'
    )
  }

  return 'description' in item ? item.description ?? '-' : '-'
}

function singularTitle(title: string) {
  return title.endsWith('s') ? title.slice(0, -1) : title
}
