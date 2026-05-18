import type { ReactNode } from 'react'

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
        {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
