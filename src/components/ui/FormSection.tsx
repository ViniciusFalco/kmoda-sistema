import type { ReactNode } from 'react'

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  tone?: 'light' | 'dark'
}

export function FormSection({ title, description, children, tone = 'light' }: FormSectionProps) {
  return (
    <section
      className={`space-y-3 rounded-xl border-2 p-4 ${
        tone === 'dark'
          ? 'border-gray-200 bg-white'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
