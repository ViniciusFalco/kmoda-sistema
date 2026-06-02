import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  tone?: 'light' | 'dark'
  labelClassName?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, tone = 'light', labelClassName, ...props }, ref) => {
    const inputId = id ?? props.name
    const isDark = tone === 'dark'

    return (
      <label className="block space-y-1.5" htmlFor={inputId}>
        {label ? (
          <span className={labelClassName ?? 'text-xs font-medium uppercase tracking-[0.14em] text-gray-600'}>
            {label}
          </span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-9 w-full rounded-md border-2 px-3 text-sm outline-none transition placeholder:text-gray-400 focus:ring-2',
            isDark
              ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-100'
              : 'border-gray-300 bg-white text-gray-900 focus:border-gray-500 focus:ring-gray-100',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-50',
            className,
          )}
          {...props}
        />
        {error ? <span className="text-xs text-red-600">{error}</span> : null}
      </label>
    )
  },
)

Input.displayName = 'Input'
