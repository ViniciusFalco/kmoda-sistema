import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type BadgeVariant = 'neutral' | 'success' | 'warning'
type BadgeTone = 'light' | 'dark'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  tone?: BadgeTone
}

const lightVariants: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
}

const darkVariants: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export function Badge({ variant = 'neutral', tone = 'light', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border-2 px-2.5 py-0.5 text-[11px] font-medium',
        tone === 'dark' ? darkVariants[variant] : lightVariants[variant],
        className,
      )}
      {...props}
    />
  )
}
