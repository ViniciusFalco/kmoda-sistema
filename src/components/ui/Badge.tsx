import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'neutral' | 'success' | 'warning'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  )
}
