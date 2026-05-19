import { Search } from 'lucide-react'
import { useState } from 'react'
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
  const [internalValue, setInternalValue] = useState(value)
  const displayValue = onChange ? value : internalValue

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
      <Input
        className="pl-9"
        value={displayValue}
        placeholder={placeholder}
        onChange={(event) => {
          setInternalValue(event.target.value)
          onChange?.(event.target.value)
        }}
      />
    </div>
  )
}
