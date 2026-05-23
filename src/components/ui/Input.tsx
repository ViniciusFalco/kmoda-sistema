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
          <span className={labelClassName ?? (isDark ? 'text-sm font-medium text-white/75' : 'text-sm font-medium text-gray-700')}>
            {label}
          </span>
        ) : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-10 w-full rounded-md border px-3 text-sm outline-none transition placeholder:text-gray-400 focus:ring-2',
            isDark
              ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10'
              : 'border-gray-200 bg-white text-gray-900 focus:border-gray-400 focus:ring-gray-100',
            error && (isDark ? 'border-rose-400/40 focus:border-rose-300 focus:ring-rose-500/10' : 'border-red-300 focus:border-red-400 focus:ring-red-50'),
            className,
          )}
          {...props}
        />
        {error ? <span className={isDark ? 'text-xs text-rose-300' : 'text-xs text-red-600'}>{error}</span> : null}
      </label>
    )
  },
)

Input.displayName = 'Input'
