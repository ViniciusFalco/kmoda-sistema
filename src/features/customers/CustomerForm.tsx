import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { createCustomer, deleteCustomer, friendlyCatalogError, updateCustomer } from '../../lib/catalog'
import { formatCPF, formatPhoneBR, normalizeCPF, normalizePhone, onlyNumbers } from '../../lib/utils'
import type { Customer } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'

interface CustomerFormProps {
  customer?: Customer | null
  onCancel: () => void
  onSaved: (customer: Customer) => void
  onDeleted?: () => void
}

export function CustomerForm({ customer, onCancel, onSaved, onDeleted }: CustomerFormProps) {
  const { user, isAdmin } = useAuth()
  const [name, setName] = useState(customer?.name ?? '')
  const [phone, setPhone] = useState(customer?.phone ? formatPhoneBR(customer.phone) : '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [cpf, setCpf] = useState(customer?.cpf ? formatCPF(customer.cpf) : '')
  const [notes, setNotes] = useState(customer?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!isAdmin) {
      setError('Apenas a administradora pode alterar clientes.')
      return
    }

    if (!name.trim()) {
      setError('Informe o nome do cliente.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        name,
        phone: normalizePhone(phone),
        email,
        cpf: normalizeCPF(cpf),
        notes,
        user,
      }
      const saved = customer ? await updateCustomer(customer.id, payload) : await createCustomer(payload)
      onSaved(saved)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!customer) {
      return
    }

    if (!isAdmin) {
      setError('Apenas a administradora pode excluir clientes.')
      return
    }

    const confirmed = window.confirm(`Excluir o cliente "${customer.name}"?`)
    if (!confirmed) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      await deleteCustomer(customer.id)
      onDeleted?.()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nome" value={name} onChange={(event) => setName(event.target.value)} required />
        <Input
          label="Telefone"
          value={phone}
          inputMode="tel"
          placeholder="(11) 9 1234-5678"
          maxLength={16}
          onChange={(event) => setPhone(formatPhoneBR(onlyNumbers(event.target.value)))}
        />
        <Input label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <Input
          label="CPF opcional"
          value={cpf === '-' ? '' : cpf}
          inputMode="numeric"
          maxLength={14}
          placeholder="123.456.789-10"
          onChange={(event) => setCpf(formatCPF(onlyNumbers(event.target.value)))}
        />
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">Observações</span>
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {customer && isAdmin ? (
          <Button type="button" variant="secondary" onClick={handleDelete} disabled={submitting || deleting}>
            {deleting ? 'Excluindo...' : 'Excluir cliente'}
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || !isAdmin}>
          {submitting ? 'Salvando...' : 'Salvar cliente'}
        </Button>
      </div>
    </form>
  )
}
