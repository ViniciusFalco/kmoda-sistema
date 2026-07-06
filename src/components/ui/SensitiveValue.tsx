import { cn } from '../../lib/utils'

interface SensitiveValueProps {
  value: string
  hidden?: boolean
  className?: string
  tone?: 'light' | 'dark'
}

export function SensitiveValue({ value, hidden = false, className, tone = 'light' }: SensitiveValueProps) {
  return (
    <span className={cn('relative inline-block max-w-full align-baseline', hidden && 'min-w-[7.25rem] select-none', className)}>
      <span
        className={cn(
          'block truncate transition duration-200',
          hidden && (tone === 'dark' ? 'text-white/60 blur-[2px]' : 'text-gray-950/45 blur-[2px]'),
        )}
      >
        {value}
      </span>

      {hidden ? (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 top-1/2 h-[1.15em] -translate-y-1/2 overflow-hidden rounded-md border shadow-inner backdrop-blur-md',
            tone === 'dark'
              ? 'border-white/25 bg-[linear-gradient(105deg,rgba(255,255,255,0.32),rgba(255,255,255,0.78),rgba(255,255,255,0.26))]'
              : 'border-gray-200/80 bg-[linear-gradient(105deg,rgba(229,231,235,0.92),rgba(255,255,255,0.94),rgba(209,213,219,0.88))]',
          )}
        >
          <span
            className={cn(
              'absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 rotate-12 blur-sm',
              tone === 'dark' ? 'bg-white/35' : 'bg-white/70',
            )}
          />
        </span>
      ) : null}
    </span>
  )
}
