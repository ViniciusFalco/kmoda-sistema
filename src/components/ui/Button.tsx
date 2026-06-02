import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'
type ButtonTone = 'light' | 'dark'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  tone?: ButtonTone
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900 shadow-sm',
  secondary: 'bg-white text-gray-800 hover:bg-gray-50 border-gray-300 shadow-sm',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-red-600 shadow-sm',
}

const darkVariants: Record<ButtonVariant, string> = {
  primary: 'bg-white text-zinc-950 hover:bg-gray-100 border-white/20',
  secondary: 'bg-white/5 text-white hover:bg-white/10 border-white/10',
  ghost: 'bg-transparent text-white/70 hover:bg-white/10 border-transparent',
  danger: 'bg-rose-500 text-white hover:bg-rose-400 border-rose-500',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs sm:text-sm',
  md: 'h-9 px-4 text-sm',
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  tone = 'light',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border-2 font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        tone === 'dark' ? darkVariants[variant] : variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}
