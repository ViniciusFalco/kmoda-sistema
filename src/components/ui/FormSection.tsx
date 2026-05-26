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
      className={`space-y-4 rounded-2xl border p-4 ${
        tone === 'dark'
          ? 'border-white/10 bg-white/[0.03]'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div>
        <h3 className={`text-sm font-semibold ${tone === 'dark' ? 'text-white' : 'text-gray-950'}`}>{title}</h3>
        {description ? (
          <p className={`mt-1 text-xs ${tone === 'dark' ? 'text-white/55' : 'text-gray-500'}`}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  )
}
