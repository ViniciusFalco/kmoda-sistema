import { Edit, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { friendlyCatalogError, listCustomers } from '../../lib/catalog'
import { formatCPF, formatDateBR, formatPhoneBR } from '../../lib/utils'
import type { Customer } from '../../types/database'
import { CustomerForm } from './CustomerForm'
import { Pagination } from '../../components/ui/Pagination'

type CustomerModal = 'create' | 'details' | 'edit' | null

export function CustomersPage() {
  const [searchParams] = useSearchParams()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [modal, setModal] = useState<CustomerModal>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const query = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const visibleCustomers = useMemo(() => {
    if (!query) {
      return customers
    }

    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email, customer.cpf]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }, [customers, query])

  const totalPages = Math.ceil(visibleCustomers.length / itemsPerPage)

  const paginatedCustomers = useMemo(() => {
    
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = currentPage * itemsPerPage

    return visibleCustomers.slice(startIndex, endIndex)
  }, [visibleCustomers, currentPage, itemsPerPage])

  const totalCustomers = visibleCustomers.length

  const firstCustomerIndex = (currentPage - 1) * itemsPerPage + 1

  const lastCustomerIndex = Math.min(
    currentPage * itemsPerPage,
    totalCustomers,
  )

  const customerLabel = totalCustomers === 1 ? 'cliente' : 'clientes'

  async function loadCustomers() {
    setLoading(true)
    setError('')

    try {
      setCustomers(await listCustomers())
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    listCustomers()
      .then((rows) => {
        if (active) {
          setCustomers(rows)
        }
      })
      .catch((err) => {
        if (active) {
          setError(friendlyCatalogError(err))
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    setCurrentPage(1)
  }, [query])

  async function handleSaved(customer: Customer) {
    setSelectedCustomer(customer)
    setModal('details')
    await loadCustomers()
  }

  return (
    <Card
      title="Clientes"
      description="Adicione e gerencie os clientes para facilitar o processo de venda e o relacionamento com seus compradores."
      action={
        <Button onClick={() => setModal('create')}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      }
    >
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Carregando clientes...
        </div>
      ) : visibleCustomers.length === 0 ? (
        <EmptyState
          title={query ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
          description={query ? 'Tente outro termo de busca no cabeçalho.' : 'Crie o primeiro cliente para começar.'}
        />
      ) : (
  <>
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm">
          <thead className="bg-black text-[11px] uppercase tracking-[0.14em] text-white">
            <tr>
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Telefone</th>
              <th className="px-4 py-3 font-semibold">E-mail</th>
              <th className="px-4 py-3 font-semibold">CPF</th>
              <th className="px-4 py-3 font-semibold">Observações</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {paginatedCustomers.map((customer) => (
              <tr
                key={customer.id}
                className="cursor-pointer text-gray-700 transition hover:bg-gray-50"
                onClick={() => {
                  setSelectedCustomer(customer)
                  setModal('details')
                }}
              >
                <td className="px-4 py-3 font-medium text-gray-950">{customer.name}</td>
                <td className="px-4 py-3">{formatPhoneBR(customer.phone)}</td>
                <td className="px-4 py-3">{customer.email ?? '-'}</td>
                <td className="px-4 py-3">{formatCPF(customer.cpf)}</td>
                <td className="px-4 py-3">{customer.notes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
                  <span className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-gray-500">
                    Exibindo {firstCustomerIndex}–{lastCustomerIndex} de {totalCustomers} {customerLabel}
                    <span className="text-gray-400">•</span>
                    {itemsPerPage} por página
                  </span>
      </div>
    </div>

    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
    />
  </>
)}

      <Modal open={modal === 'create'} title="Novo cliente" onClose={() => setModal(null)}>
        <CustomerForm onCancel={() => setModal(null)} onSaved={handleSaved} />
      </Modal>

      <Modal open={modal === 'edit'} title="Editar cliente" onClose={() => setModal(null)}>
        <CustomerForm
          customer={selectedCustomer}
          onCancel={() => setModal('details')}
          onSaved={handleSaved}
          onDeleted={async () => {
            setModal(null)
            setSelectedCustomer(null)
            await loadCustomers()
          }}
        />
      </Modal>

      <Modal
        open={modal === 'details' && selectedCustomer !== null}
        title={selectedCustomer?.name ?? 'Cliente'}
        onClose={() => setModal(null)}
        size="lg"
      >
        {selectedCustomer ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="Nome" value={selectedCustomer.name} />
              <Detail label="Telefone" value={formatPhoneBR(selectedCustomer.phone)} />
              <Detail label="E-mail" value={selectedCustomer.email ?? '-'} />
              <Detail label="CPF" value={formatCPF(selectedCustomer.cpf)} />
              <Detail label="Criado em" value={formatDateBR(selectedCustomer.created_at)} />
              <Detail label="Atualizado em" value={formatDateBR(selectedCustomer.updated_at)} />
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">Observações</p>
              <p className="mt-1 text-sm text-gray-600">{selectedCustomer.notes || 'Sem observações.'}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setModal('edit')}>
                <Edit className="h-4 w-4" />
                Editar cliente
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium uppercase text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || '-'}</p>
    </div>
  )
}
