import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name

    return (
      <label className="block space-y-1.5" htmlFor={inputId}>
        {label ? <span className="text-sm font-medium text-gray-700">{label}</span> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-50',
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
