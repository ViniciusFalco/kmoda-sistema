import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'neutral' | 'success' | 'warning'
type BadgeTone = 'light' | 'dark'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  tone?: BadgeTone
}

const lightVariants: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
}

const darkVariants: Record<BadgeVariant, string> = {
  neutral: 'bg-white/10 text-white/80',
  success: 'bg-emerald-500/15 text-emerald-200',
  warning: 'bg-amber-500/15 text-amber-200',
}

export function Badge({ variant = 'neutral', tone = 'light', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2 py-1 text-xs font-medium',
        tone === 'dark' ? darkVariants[variant] : lightVariants[variant],
        className,
      )}
      {...props}
    />
  )
}
