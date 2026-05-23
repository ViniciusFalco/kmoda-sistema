import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  tone?: 'light' | 'dark'
}

export function EmptyState({ title, description, action, tone = 'light' }: EmptyStateProps) {
  return (
    <div
      className={`flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center ${
        tone === 'dark'
          ? 'border-white/10 bg-white/[0.04]'
          : 'border-gray-200 bg-white'
      }`}
    >
      <h3 className={`text-sm font-semibold ${tone === 'dark' ? 'text-white' : 'text-gray-950'}`}>{title}</h3>
      {description ? <p className={`mt-1 max-w-md text-sm ${tone === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
