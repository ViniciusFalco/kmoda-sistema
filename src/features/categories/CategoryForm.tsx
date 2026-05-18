import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Category } from '../../types/database'

export interface CategoryFormValues {
  name: string
  description: string
}

interface CategoryFormProps {
  category?: Category | null
  submitting?: boolean
  onCancel: () => void
  onSubmit: (values: CategoryFormValues) => Promise<void> | void
}

export function CategoryForm({ category, submitting = false, onCancel, onSubmit }: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormValues>({
    name: category?.name ?? '',
    description: category?.description ?? '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryFormValues, string>>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors: Partial<Record<keyof CategoryFormValues, string>> = {}
    if (!values.name.trim()) {
      nextErrors.name = 'Informe o nome da categoria.'
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit(values)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        label="Nome da categoria"
        name="name"
        value={values.name}
        onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
        error={errors.name}
        required
      />
      <Input
        label="Descrição"
        name="description"
        value={values.description}
        onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar categoria'}
        </Button>
      </div>
    </form>
  )
}
