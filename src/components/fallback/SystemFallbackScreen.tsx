import type { ReactNode } from 'react'
import { Button } from '../ui/Button'

interface SystemFallbackScreenProps {
  logoAlt?: string
  title: string
  description: string
  primaryActionLabel: string
  onPrimaryAction: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  secondaryAction?: ReactNode
}

export function SystemFallbackScreen({
  logoAlt = '.K Moda',
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryAction,
}: SystemFallbackScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8 text-gray-950">
      <section className="w-full max-w-xl rounded-[1.25rem] border-2 border-gray-200 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(17,24,39,0.08)] sm:px-8 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt={logoAlt} className="h-12 w-auto object-contain" />

          <div className="mt-6 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-500">
            Sistema
          </div>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>

          <p className="mt-3 max-w-md text-sm leading-6 text-gray-600 sm:text-base">{description}</p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button className="min-w-52" onClick={onPrimaryAction}>
              {primaryActionLabel}
            </Button>

            {secondaryActionLabel ? (
              secondaryAction ? (
                secondaryAction
              ) : (
                <Button variant="secondary" className="min-w-52" onClick={onSecondaryAction}>
                  {secondaryActionLabel}
                </Button>
              )
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
