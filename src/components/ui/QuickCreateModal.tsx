import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Modal } from './Modal'

interface QuickCreateModalProps {
  open: boolean
  title: string
  descriptionLabel?: string
  submitting?: boolean
  error?: string
  onClose: () => void
  onSubmit: (values: { name: string; description: string }) => Promise<void> | void
}

export function QuickCreateModal({
  open,
  title,
  descriptionLabel = 'Descrição',
  submitting = false,
  error,
  onClose,
  onSubmit,
}: QuickCreateModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setNameError('Informe o nome.')
      return
    }

    await onSubmit({ name, description })
    setName('')
    setDescription('')
    setNameError('')
  }

  return (
    <Modal open={open} title={title} onClose={onClose} size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
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
        <Input
          label={descriptionLabel}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
