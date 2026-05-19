import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCustomers, listProducts, friendlyCatalogError } from '../../lib/catalog'
import { formatPhoneBR } from '../../lib/utils'
import { Input } from './Input'

interface QuickSearchProps {
  value?: string
  placeholder?: string
  onChange?: (value: string) => void
}

export function QuickSearch({
  value = '',
  placeholder = 'Buscar no sistema',
  onChange,
}: QuickSearchProps) {
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = useState(value)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  const displayValue = onChange ? value : internalValue

  useEffect(() => {
    if (!onChange) {
      setInternalValue(value)
    }
  }, [onChange, value])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    const term = displayValue.trim()

    if (term.length < 2) {
      setResults([])
      setLoading(false)
      setError('')
      return
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true)
      setError('')

      try {
        const [products, customers] = await Promise.all([
          listProducts({ query: term, active: true }),
          listCustomers(),
        ])

        const normalized = term.toLowerCase()
        const customerMatches = customers.filter((customer) =>
          [customer.name, customer.phone, customer.email, customer.cpf]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalized)),
        )

        setResults([
          ...products.slice(0, 6).map((product) => ({
            type: 'product' as const,
            id: product.id,
            title: product.name,
            subtitle: [product.brand?.name, product.clothing_type?.name, product.size?.name, product.color?.name]
              .filter(Boolean)
              .join(' • '),
            detail: product.barcode ? `Código: ${product.barcode}` : `Estoque: ${product.stock_quantity}`,
            href: `/produtos?q=${encodeURIComponent(term)}`,
          })),
          ...customerMatches.slice(0, 4).map((customer) => ({
            type: 'customer' as const,
            id: customer.id,
            title: customer.name,
            subtitle: [customer.email, formatPhoneBR(customer.phone)].filter((item) => item && item !== '-').join(' • '),
            detail: customer.cpf ? `CPF: ${customer.cpf}` : 'Cliente cadastrado',
            href: `/clientes?q=${encodeURIComponent(term)}`,
          })),
        ])
      } catch (err) {
        setError(friendlyCatalogError(err))
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => window.clearTimeout(timeout)
  }, [displayValue])

  const hasQuery = displayValue.trim().length >= 2
  const showDropdown = open && (loading || hasQuery)

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
      <Input
        className="pl-9"
        value={displayValue}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setInternalValue(event.target.value)
          onChange?.(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
          }

          if (event.key === 'Enter' && results.length > 0) {
            event.preventDefault()
            navigate(results[0].href)
            setOpen(false)
          }
        }}
      />
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          {loading ? (
            <div className="px-4 py-3 text-sm text-gray-500">Buscando...</div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">Nenhum resultado encontrado.</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <SearchGroup
                title="Produtos"
                items={results.filter((item) => item.type === 'product')}
                onSelect={(item) => {
                  navigate(item.href)
                  setOpen(false)
                }}
              />
              <SearchGroup
                title="Clientes"
                items={results.filter((item) => item.type === 'customer')}
                onSelect={(item) => {
                  navigate(item.href)
                  setOpen(false)
                }}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

type SearchResult = {
  type: 'product' | 'customer'
  id: string
  title: string
  subtitle?: string
  detail?: string
  href: string
}

function SearchGroup({
  title,
  items,
  onSelect,
}: {
  title: string
  items: SearchResult[]
  onSelect: (item: SearchResult) => void
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <p className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="py-1">
        {items.map((item) => (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            className="flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-50"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-950">{item.title}</p>
              <p className="truncate text-xs text-gray-500">{item.subtitle || item.detail || '-'}</p>
            </div>
            <p className="shrink-0 text-xs text-gray-400">{item.detail || ''}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
