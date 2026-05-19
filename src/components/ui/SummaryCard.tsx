import type { ReactNode } from 'react'

interface SummaryCardProps {
  label: string
  value: string
  icon?: ReactNode
}

export function SummaryCard({ label, value, icon }: SummaryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{value}</p>
        </div>
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-700">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  )
}
