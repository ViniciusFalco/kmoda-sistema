import type { ReactNode } from 'react'

interface ActionCardProps {
  title: string
  description: string
  icon: ReactNode
  onClick: () => void
}

export function ActionCard({ title, description, icon, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-44 flex-col items-start justify-between rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-200"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-900 text-white transition group-hover:bg-gray-800">
        {icon}
      </span>
      <span>
        <span className="block text-lg font-semibold text-gray-950">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-gray-500">{description}</span>
      </span>
    </button>
  )
}
