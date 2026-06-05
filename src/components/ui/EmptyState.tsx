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
      className={`flex min-h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center ${
        tone === 'dark'
          ? 'border-gray-200 bg-white'
          : 'border-gray-200 bg-white'
      }`}
    >
      <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
