import { useEffect, useMemo, useRef } from 'react'
import { cn } from '../../lib/utils'

interface PinCodeInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  autoFocus?: boolean
  name?: string
  required?: boolean
  size?: 'default' | 'compact'
  weight?: 'regular' | 'medium' | 'semibold'
  align?: 'start' | 'center'
}

function sanitizePin(value: string, length: number) {
  return value.replace(/\D/g, '').slice(0, length)
}

export function PinCodeInput({
  value,
  onChange,
  length = 6,
  label = 'PIN',
  description,
  error,
  disabled = false,
  autoFocus = false,
  name,
  required = false,
  size = 'default',
  weight = 'semibold',
  align = 'start',
}: PinCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const digits = useMemo(() => {
    const sanitized = sanitizePin(value, length)
    return Array.from({ length }, (_, index) => sanitized[index] ?? '')
  }, [length, value])

  useEffect(() => {
    if (!autoFocus || disabled) {
      return
    }

    const firstEmptyIndex = digits.findIndex((digit) => !digit)
    const targetIndex = firstEmptyIndex === -1 ? Math.min(length - 1, digits.filter(Boolean).length) : firstEmptyIndex

    window.requestAnimationFrame(() => {
      inputsRef.current[targetIndex]?.focus()
      inputsRef.current[targetIndex]?.select()
    })
  }, [autoFocus, disabled, digits, length])

  function focusIndex(index: number) {
    const nextIndex = Math.max(0, Math.min(length - 1, index))
    inputsRef.current[nextIndex]?.focus()
    inputsRef.current[nextIndex]?.select()
  }

  function updateDigits(startIndex: number, insertedValue: string) {
    const current = [...digits]
    const nextDigits = sanitizePin(insertedValue, length)

    if (!nextDigits) {
      return
    }

    let writeIndex = startIndex
    for (const digit of nextDigits) {
      if (writeIndex >= length) {
        break
      }
      current[writeIndex] = digit
      writeIndex += 1
    }

    const nextValue = current.join('').slice(0, length)
    onChange(nextValue)

    const focusTarget = Math.min(length - 1, Math.max(startIndex, writeIndex))
    window.requestAnimationFrame(() => {
      inputsRef.current[focusTarget]?.focus()
      inputsRef.current[focusTarget]?.select()
    })
  }

  return (
    <div className="space-y-2">
      {label ? <p className={cn('text-sm font-medium text-gray-700', align === 'center' && 'text-center')}>{label}</p> : null}
      {description ? <p className={cn('text-xs text-gray-500', align === 'center' && 'text-center')}>{description}</p> : null}
      <div
        className={cn('flex flex-wrap gap-2', size === 'compact' && 'gap-1.5', align === 'center' && 'justify-center')}
        role="group"
        aria-label={label}
      >
        {Array.from({ length }, (_, index) => {
          const filled = Boolean(digits[index])

          return (
          <input
            key={index}
            ref={(node) => {
              inputsRef.current[index] = node
            }}
            name={index === 0 ? name : undefined}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digits[index]}
            aria-label={`${label} dígito ${index + 1}`}
            aria-required={required}
            onChange={(event) => {
              const raw = event.target.value
              if (!raw) {
                const current = [...digits]
                current[index] = ''
                onChange(current.join(''))
                return
              }

              updateDigits(index, raw)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace') {
                event.preventDefault()

                if (digits[index]) {
                  const current = [...digits]
                  current[index] = ''
                  onChange(current.join(''))
                  window.requestAnimationFrame(() => {
                    inputsRef.current[index]?.focus()
                  })
                  return
                }

                const previousIndex = index - 1
                if (previousIndex >= 0) {
                  const current = [...digits]
                  current[previousIndex] = ''
                  onChange(current.join(''))
                  window.requestAnimationFrame(() => focusIndex(previousIndex))
                }
                return
              }

              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                focusIndex(index - 1)
                return
              }

              if (event.key === 'ArrowRight') {
                event.preventDefault()
                focusIndex(index + 1)
                return
              }

              if (event.key === 'Home') {
                event.preventDefault()
                focusIndex(0)
                return
              }

              if (event.key === 'End') {
                event.preventDefault()
                focusIndex(length - 1)
              }
            }}
            onPaste={(event) => {
              event.preventDefault()
              updateDigits(index, event.clipboardData.getData('text'))
            }}
            onFocus={(event) => {
              event.currentTarget.select()
            }}
            className={cn(
              'border-2 text-center outline-none transition placeholder:text-gray-300 focus:ring-2 disabled:cursor-not-allowed disabled:text-gray-500',
              size === 'compact'
                ? 'h-11 w-9 rounded-lg text-base tracking-[0.1em] sm:h-12 sm:w-10'
                : 'h-14 w-12 rounded-xl text-2xl tracking-[0.2em] sm:h-16 sm:w-14',
              weight === 'regular' ? 'font-normal' : weight === 'medium' ? 'font-medium' : 'font-semibold',
              filled
                ? 'border-black bg-black text-black focus:border-black focus:ring-black/15'
                : error
                  ? 'border-red-400 bg-white text-gray-950 focus:border-red-500 focus:ring-red-50'
                  : 'border-gray-300 bg-white text-gray-950 focus:border-gray-900 focus:ring-gray-100',
            )}
            style={{ WebkitTextSecurity: 'disc' } as any}
          />
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">Digite os 6 números do PIN.</p>
        <p className="text-xs font-medium text-gray-500">{value.length}/{length}</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
