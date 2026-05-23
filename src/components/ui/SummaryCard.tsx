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
          ? 'rounded-3xl border border-black/10 bg-black p-6 shadow-[0_18px_45px_rgba(0,0,0,0.18)]'
          : 'rounded-3xl border border-gray-200 bg-white p-6 shadow-sm'
      }
    >
      <div className="flex items-center justify-between gap-5">
        <div className="min-w-0">
          <p
            className={
              isDark
                ? 'text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55'
                : 'text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400'
            }
          >
            {label}
          </p>

          <p
            className={
              isDark
                ? 'mt-4 text-3xl font-semibold tracking-[-0.06em] text-white'
                : 'mt-4 text-3xl font-semibold tracking-[-0.06em] text-gray-950'
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
                  ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-500 text-white'
                  : isRed
                    ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-400/20 bg-rose-500 text-white'
                    : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white'
                : isGreen
                  ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : isRed
                    ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700'
                    : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-800'
            }
          >
            {icon}
          </div>
        ) : null}
      </div>

      <div className={isDark ? 'mt-5 h-px w-full bg-white/10' : 'mt-5 h-px w-full bg-gray-100'} />
    </div>
  )
}
