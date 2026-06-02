import type { ReactNode } from 'react'

interface SummaryCardProps {
  label: string
  value: string
  icon?: ReactNode
  tone?: 'light' | 'dark'
  accent?: 'default' | 'green' | 'red'
}

export function SummaryCard({ label, value, icon, tone = 'light', accent = 'default' }: SummaryCardProps) {
  const isDark = tone === 'dark'
  const isGreen = accent === 'green'
  const isRed = accent === 'red'

  return (
    <div
      className={
        isDark
          ? 'rounded-xl border-2 border-gray-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]'
          : 'rounded-xl border-2 border-gray-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]'
      }
    >
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <p
            className={
              isDark
                ? 'text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400'
                : 'text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400'
            }
          >
            {label}
          </p>

          <p
            className={
              isDark
                ? 'mt-3 text-2xl font-semibold tracking-[-0.05em] text-gray-950 sm:text-3xl'
                : 'mt-3 text-2xl font-semibold tracking-[-0.05em] text-gray-950 sm:text-3xl'
            }
          >
            {value}
          </p>
        </div>

        {icon ? (
          <div
            className={
              isDark
            ? isGreen
                  ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-200 bg-emerald-50 text-emerald-700'
                  : isRed
                    ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-rose-200 bg-rose-50 text-rose-700'
                    : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-700'
                : isGreen
                  ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-200 bg-emerald-50 text-emerald-700'
                  : isRed
                    ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-rose-200 bg-rose-50 text-rose-700'
                    : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-gray-200 bg-gray-50 text-gray-800'
            }
          >
            {icon}
          </div>
        ) : null}
      </div>

      <div className="mt-4 h-px w-full bg-gray-100" />
    </div>
  )
}
