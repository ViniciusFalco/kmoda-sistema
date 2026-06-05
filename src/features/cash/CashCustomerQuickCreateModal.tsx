import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { createCustomer, friendlyCatalogError } from '../../lib/catalog'
import { formatCPF, formatPhoneBR, normalizeCPF, normalizePhone, onlyNumbers } from '../../lib/utils'
import type { Customer } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'

interface CashCustomerQuickCreateModalProps {
  open: boolean
  onClose: () => void
  onCreated: (customer: Customer) => void
  initialName?: string
}

export function CashCustomerQuickCreateModal({ open, onClose, onCreated, initialName = '' }: CashCustomerQuickCreateModalProps) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpf, setCpf] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function resetForm() {
    setName('')
    setPhone('')
    setCpf('')
    setSubmitting(false)
    setError('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  useEffect(() => {
    if (!open) {
      return
    }

    setName(initialName)
    setPhone('')
    setCpf('')
    setSubmitting(false)
    setError('')
  }, [initialName, open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim()) {
      setError('Informe o nome do cliente.')
      return
    }

    if (!normalizePhone(phone)) {
      setError('Informe um telefone válido.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const saved = await createCustomer({
        name,
        phone: normalizePhone(phone),
        cpf: normalizeCPF(cpf),
        user,
      })
      onCreated(saved)
      handleClose()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title="Novo cliente" onClose={handleClose} size="md">
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        <Input
          label="Nome"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="Telefone"
          inputMode="tel"
          placeholder="(11) 9 1234-5678"
          value={phone}
          onChange={(event) => setPhone(formatPhoneBR(onlyNumbers(event.target.value)))}
        />
        <Input
          label="CPF opcional"
          inputMode="numeric"
          placeholder="123.456.789-10"
          value={cpf}
          onChange={(event) => setCpf(formatCPF(onlyNumbers(event.target.value)))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
