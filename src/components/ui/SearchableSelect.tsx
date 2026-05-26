import { Check, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './Button'

export interface SelectOption {
  value: string
  label: string
  description?: string
  meta?: string
}

interface SearchableSelectProps {
  label?: string
  placeholder: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  quickCreateLabel?: string
  onQuickCreate?: () => void
  error?: string
  disabled?: boolean
  tone?: 'light' | 'dark'
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
  tone = 'light',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 })
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open || !rootRef.current) {
      return
    }

    function updatePosition() {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

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
    <div ref={rootRef} className="relative space-y-1.5">
      {label ? (
        <span className={`text-sm font-medium ${tone === 'dark' ? 'text-white/75' : 'text-gray-700'}`}>
          {label}
        </span>
      ) : null}
      <div
        className={cn(
          'flex h-10 items-center gap-2 rounded-md px-3 text-sm transition focus-within:ring-2',
          tone === 'dark'
            ? 'border border-white/10 bg-white/[0.04] text-white focus-within:border-white/20 focus-within:ring-white/10'
            : 'border border-gray-200 bg-white text-gray-900 focus-within:border-gray-400 focus-within:ring-gray-100',
          error &&
            (tone === 'dark'
              ? 'border-rose-400/40 focus-within:border-rose-300 focus-within:ring-rose-500/10'
              : 'border-red-300 focus-within:border-red-400 focus-within:ring-red-50'),
          disabled && 'opacity-60',
        )}
      >
        <Search className={`h-4 w-4 shrink-0 ${tone === 'dark' ? 'text-white/35' : 'text-gray-400'}`} />
        <input
          ref={inputRef}
          value={open ? query : selected?.label ?? ''}
          disabled={disabled}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400 ${
            tone === 'dark' ? 'text-white placeholder:text-white/35' : 'text-gray-900'
          }`}
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
      {error ? (
        <span className={`text-xs ${tone === 'dark' ? 'text-rose-300' : 'text-red-600'}`}>{error}</span>
      ) : null}

      {open ? (
        <div
          className={`fixed z-[90] max-h-72 overflow-y-auto rounded-md border p-1 text-sm shadow-xl ${
            tone === 'dark'
              ? 'border-white/10 bg-[#050505] text-white'
              : 'border-gray-200 bg-white text-gray-700'
          }`}
          style={{ top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width }}
        >
          {filteredOptions.length === 0 ? (
            <div className={`px-3 py-3 ${tone === 'dark' ? 'text-white/45' : 'text-gray-500'}`}>
              Nenhum item encontrado.
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left transition',
                  tone === 'dark'
                    ? 'text-white/80 hover:bg-white/10'
                    : 'text-gray-700 hover:bg-gray-50',
                  index === highlightedIndex && (tone === 'dark' ? 'bg-white/10' : 'bg-gray-50'),
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectOption(option)}
              >
                <span>
                  <span className={`block font-medium ${tone === 'dark' ? 'text-white' : 'text-gray-950'}`}>
                    {option.label}
                  </span>
                  {option.meta ? (
                    <span className={`block text-xs ${tone === 'dark' ? 'text-white/45' : 'text-gray-500'}`}>
                      {option.meta}
                    </span>
                  ) : null}
                </span>
                {option.value === value ? (
                  <Check className={`h-4 w-4 ${tone === 'dark' ? 'text-white' : 'text-gray-900'}`} />
                ) : null}
              </button>
            ))
          )}
          {onQuickCreate && quickCreateLabel ? (
            <div className={`mt-1 border-t pt-1 ${tone === 'dark' ? 'border-white/10' : 'border-gray-100'}`}>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                tone={tone}
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
