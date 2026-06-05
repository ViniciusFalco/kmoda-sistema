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
      className={cn('rounded-xl border-2 border-gray-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] sm:p-5', className)}
      {...props}
    >
      {(title || description || action) && (
        <div className="mb-3 flex items-start justify-between gap-4 border-b-2 border-gray-100 pb-3">
          <div>
            {title ? <h2 className="text-sm font-semibold text-gray-950 sm:text-base">{title}</h2> : null}
            {description ? <p className="mt-1 text-xs text-gray-500 sm:text-sm">{description}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}
