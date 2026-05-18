import { Check, Plus, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export interface SelectOption {
  value: string
  label: string
  description?: string
  meta?: string
}

interface SearchableSelectProps {
  label: string
  placeholder: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  quickCreateLabel?: string
  onQuickCreate?: () => void
  error?: string
  disabled?: boolean
}

export function SearchableSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  quickCreateLabel,
  onQuickCreate,
  error,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((option) => option.value === value)

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return options
    }

    return options.filter((option) =>
      [option.label, option.description, option.meta]
        .filter(Boolean)
        .some((text) => text?.toLowerCase().includes(normalized)),
    )
  }, [options, query])

  function selectOption(option: SelectOption) {
    onChange(option.value)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative space-y-1.5">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm transition focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100',
          error && 'border-red-300 focus-within:border-red-400 focus-within:ring-red-50',
          disabled && 'opacity-60',
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          value={open ? query : selected?.label ?? ''}
          disabled={disabled}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setHighlightedIndex(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setOpen(true)
              setHighlightedIndex((current) => Math.min(current + 1, filteredOptions.length - 1))
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              setHighlightedIndex((current) => Math.max(current - 1, 0))
            }
            if (event.key === 'Enter' && open) {
              event.preventDefault()
              const option = filteredOptions[highlightedIndex]
              if (option) {
                selectOption(option)
              }
            }
            if (event.key === 'Escape') {
              setOpen(false)
              setQuery('')
            }
          }}
        />
      </div>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}

      {open ? (
        <div className="absolute z-[60] mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 text-sm shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-3 text-gray-500">Nenhum item encontrado.</div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-gray-700 hover:bg-gray-50',
                  index === highlightedIndex && 'bg-gray-50',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span>
                  <span className="block font-medium text-gray-950">{option.label}</span>
                  {option.meta ? <span className="block text-xs text-gray-500">{option.meta}</span> : null}
                </span>
                {option.value === value ? <Check className="h-4 w-4 text-gray-900" /> : null}
              </button>
            ))
          )}
          {onQuickCreate && quickCreateLabel ? (
            <div className="mt-1 border-t border-gray-100 pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setOpen(false)
                  setQuery('')
                  onQuickCreate()
                }}
              >
                <Plus className="h-4 w-4" />
                {quickCreateLabel}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
