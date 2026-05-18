import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: ReactNode
}

export function Card({ title, description, action, className, children, ...props }: CardProps) {
  return (
    <section
      className={cn('rounded-lg border border-gray-200 bg-white p-5 shadow-sm', className)}
      {...props}
    >
      {(title || description || action) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-base font-semibold text-gray-950">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
