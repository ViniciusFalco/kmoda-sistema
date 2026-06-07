import { Edit, ExternalLink, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { friendlyCatalogError, formatSalePaymentSummary, listCustomers, listSalesByCustomer } from '../../lib/catalog'
import { formatCPF, formatCurrencyBRL, formatDateBR, formatDateTimeBR, formatPhoneBR } from '../../lib/utils'
import type { Customer, Sale } from '../../types/database'
import { CustomerForm } from './CustomerForm'

type CustomerModal = 'create' | 'details' | 'edit' | null

export function CustomersPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [modal, setModal] = useState<CustomerModal>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tableQuery, setTableQuery] = useState('')
  const [sales, setSales] = useState<Sale[]>([])
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesError, setSalesError] = useState('')
  const [salesPage, setSalesPage] = useState(1)
  const [salesCount, setSalesCount] = useState(0)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const salesPageSize = 5

  const query = searchParams.get('q')?.trim().toLowerCase() ?? ''
  const normalizedTableQuery = tableQuery.trim().toLowerCase()
  const visibleCustomers = useMemo(() => {
    if (!query && !normalizedTableQuery) {
      return customers
    }

    return customers.filter((customer) =>
      {
        const fields = [customer.name, customer.phone, customer.email, customer.cpf, customer.notes]
          .filter(Boolean)
          .map((value) => value?.toLowerCase() ?? '')

        const matchesQuery = !query || fields.some((value) => value.includes(query))
        const matchesTableQuery = !normalizedTableQuery || fields.some((value) => value.includes(normalizedTableQuery))

        return matchesQuery && matchesTableQuery
      },
    )
  }, [customers, normalizedTableQuery, query])

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
  const salesTotalPages = Math.max(1, Math.ceil(salesCount / salesPageSize))
  const salesFirstIndex = salesCount > 0 ? (salesPage - 1) * salesPageSize + 1 : 0
  const salesLastIndex = salesCount > 0 ? Math.min(salesPage * salesPageSize, salesCount) : 0
  const salesLabel = salesCount === 1 ? 'venda' : 'vendas'

  function openSaleInCash(saleId: string) {
    navigate(`/caixa?sale_id=${encodeURIComponent(saleId)}`)
  }

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
    if (modal !== 'details' || !selectedCustomer) {
      return
    }

    let active = true

    setSalesLoading(true)
    setSalesError('')
    setSales([])
    setSalesCount(0)

    listSalesByCustomer(selectedCustomer.id, salesPage, salesPageSize)
      .then((result) => {
        if (!active) {
          return
        }

        setSales(result.data)
        setSalesCount(result.count)
        setSalesPage(result.page)
      })
      .catch((err) => {
        if (active) {
          setSalesError(friendlyCatalogError(err))
        }
      })
      .finally(() => {
        if (active) {
          setSalesLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [modal, selectedCustomer, salesPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [normalizedTableQuery, query])

  async function handleSaved(customer: Customer) {
    setSelectedCustomer(customer)
    setSalesPage(1)
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

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-600" />
          <Input
            className="pl-9"
            placeholder="Pesquisar na tabela por nome, telefone, e-mail, CPF ou observações"
            value={tableQuery}
            onChange={(event) => setTableQuery(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Carregando clientes...
          </div>
        ) : visibleCustomers.length === 0 ? (
          <EmptyState
            title={query || normalizedTableQuery ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}
            description={
              query || normalizedTableQuery
                ? 'Tente outro termo de busca.'
                : 'Crie o primeiro cliente para começar.'
            }
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
                          setSalesPage(1)
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

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

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
        size="6xl"
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
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Histórico de vendas</p>
                  <p className="text-xs text-gray-500">Últimas vendas registradas para este cliente.</p>
                </div>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                  {salesCount} {salesLabel}
                </span>
              </div>

              {salesLoading ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Carregando histórico de vendas...
                </div>
              ) : salesError ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{salesError}</div>
              ) : sales.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  Nenhuma venda registrada para este cliente.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] border-collapse bg-white text-left text-sm">
                        <thead className="bg-black text-[11px] uppercase tracking-[0.14em] text-white">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Data</th>
                            <th className="px-4 py-3 font-semibold">Total</th>
                            <th className="px-4 py-3 font-semibold">Pagamento</th>
                            <th className="px-4 py-3 font-semibold">Itens</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sales.map((sale) => (
                          <tr key={sale.id} className="text-gray-700">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-950">{formatDateBR(sale.sale_date)}</div>
                              <div className="text-xs text-gray-500">{formatDateTimeBR(sale.created_at)}</div>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-950">{formatCurrencyBRL(sale.total_amount)}</td>
                            <td className="px-4 py-3 text-gray-600">{formatSalePaymentSummary(sale)}</td>
                            <td className="px-4 py-3 text-gray-600">{formatSaleItemsSummary(sale)}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={sale.status} />
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openSaleInCash(sale.id)}
                                className="whitespace-nowrap"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Ver no caixa
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs text-gray-500">
                      Exibindo {salesFirstIndex}–{salesLastIndex} de {salesCount} {salesLabel}
                      <span className="text-gray-400"> • </span>
                      {salesPageSize} por página
                    </span>
                    <Pagination
                      currentPage={salesPage}
                      totalPages={salesTotalPages}
                      onPageChange={(page) => setSalesPage(page)}
                    />
                  </div>
                </div>
              )}
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

function formatSaleItemsSummary(sale: Sale) {
  const items = sale.sale_items ?? []

  if (items.length === 0) {
    return '-'
  }

  const labels = items.map((item) => {
    const name = item.product?.product_model?.name ?? item.product?.name ?? 'Produto'
    return item.quantity > 1 ? `${item.quantity}x ${name}` : name
  })

  if (labels.length <= 3) {
    return labels.join(', ')
  }

  return `${labels.slice(0, 3).join(', ')} +${labels.length - 3}`
}
