import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

interface ActionCardProps {
  title: string
  description?: string
  icon: ReactNode
  onClick: () => void
  tone?: 'light' | 'dark'
  accent?: 'default' | 'green' | 'red'
  compact?: boolean
  appearance?: 'modern' | 'classic'
}

export function ActionCard({
  title,
  description,
  icon,
  onClick,
  tone = 'light',
  accent = 'default',
  compact = false,
  appearance = 'modern',
}: ActionCardProps) {
  const isDark = tone === 'dark'

  const accentStyles = {
    default: {
      glow: 'from-white/20',
      dot: 'bg-white/70',
      iconDark: 'bg-white/10 text-white ring-white/10',
      iconLight: 'bg-zinc-100 text-zinc-950 ring-zinc-200',
      hover: isDark ? 'hover:border-white/20' : 'hover:border-zinc-300',
    },
    green: {
      glow: 'from-emerald-400/25',
      dot: 'bg-emerald-400',
      iconDark: 'bg-emerald-400/12 text-emerald-300 ring-emerald-400/20',
      iconLight: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      hover: isDark ? 'hover:border-emerald-400/30' : 'hover:border-emerald-200',
    },
    red: {
      glow: 'from-rose-400/25',
      dot: 'bg-rose-400',
      iconDark: 'bg-rose-400/12 text-rose-300 ring-rose-400/20',
      iconLight: 'bg-rose-50 text-rose-600 ring-rose-100',
      hover: isDark ? 'hover:border-rose-400/30' : 'hover:border-rose-200',
    },
  }

  const styles = accentStyles[accent]

  if (appearance === 'classic' && !compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          group flex min-h-32 flex-col items-center justify-center gap-3
          rounded-lg border-2 p-4 text-center shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition
          hover:-translate-y-0.5 focus:outline-none focus:ring-2
          ${
            isDark
              ? 'border-gray-300 bg-white text-gray-950 hover:border-gray-400 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)] focus:ring-gray-200'
              : 'border-gray-300 bg-white text-gray-950 hover:border-gray-400 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)] focus:ring-gray-200'
          }
        `}
      >
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-md border-2 border-gray-200 bg-gray-50 text-gray-800 transition group-hover:scale-105 ${
            isDark ? 'bg-gray-50 text-gray-800' : 'bg-gray-50 text-gray-800'
          }`}
        >
          {icon}
        </span>

        <span>
          <span
            className="block text-sm font-semibold text-gray-950"
          >
            {title}
          </span>

          {description ? (
            <span className="mt-1 block text-xs leading-5 text-gray-500">
              {description}
            </span>
          ) : null}
        </span>
      </button>
    )
  }

  if (appearance === 'classic' && compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          group flex min-h-20 w-full items-center gap-4 rounded-lg border-2 border-gray-300 bg-white px-4 py-3
          text-left shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition
          hover:-translate-y-0.5 hover:border-gray-400 hover:bg-gray-50 hover:shadow-[0_14px_36px_rgba(15,23,42,0.08)]
          focus:outline-none focus:ring-2 focus:ring-gray-200
        `}
      >
        <span
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-gray-200 bg-gray-50
            text-gray-800 transition group-hover:scale-105
            ${accent === 'green' ? 'text-emerald-600' : accent === 'red' ? 'text-rose-600' : ''}
          `}
        >
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-[-0.02em] text-gray-950">{title}</span>
          {description ? <span className="mt-0.5 block text-xs leading-5 text-gray-500">{description}</span> : null}
        </span>

        <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-600" />
      </button>
    )
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`
          group relative flex h-[76px] w-full min-w-[230px] items-center gap-4
          overflow-hidden rounded-2xl border px-5 text-left
          transition-all duration-300
          focus:outline-none focus:ring-2
          ${
            isDark
              ? `
                border-zinc-200 bg-white text-zinc-950
                shadow-[0_12px_30px_rgba(15,23,42,0.08)]
                hover:-translate-y-0.5 hover:bg-zinc-50
                hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]
                focus:ring-zinc-200
                ${styles.hover}
              `
              : `
                border-zinc-200 bg-white text-zinc-950
                shadow-[0_12px_30px_rgba(15,23,42,0.08)]
                hover:-translate-y-0.5 hover:bg-zinc-50
                hover:shadow-[0_16px_38px_rgba(15,23,42,0.12)]
                focus:ring-zinc-200
                ${styles.hover}
              `
          }
        `}
      >
        <span
          className={`
            pointer-events-none absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2
            rounded-full bg-gradient-to-r ${styles.glow} to-transparent
            opacity-0 blur-2xl transition-opacity duration-300
            group-hover:opacity-100
          `}
        />

        <span
          className={`
            absolute left-0 top-1/2 h-9 w-1 -translate-y-1/2 rounded-r-full
            ${styles.dot}
          `}
        />

        <span
          className={`
            relative flex h-11 w-11 shrink-0 items-center justify-center
            rounded-xl ring-1 transition-all duration-300
            group-hover:scale-105
            ${
                isDark
                ? 'bg-gray-50 text-gray-800 ring-gray-200'
                : styles.iconLight
            }
          `}
        >
          {icon}
        </span>

        <span className="relative min-w-0 flex-1">
            <span
              className="block text-sm font-semibold tracking-[-0.02em] text-zinc-950"
            >
              {title}
            </span>

          {description ? (
            <span
              className="mt-0.5 block truncate text-xs text-zinc-500"
            >
              {description}
            </span>
          ) : null}
        </span>

        <ArrowRight
          className={`
            relative h-4 w-4 shrink-0 transition-all duration-300
            group-hover:translate-x-0.5
            ${
              isDark
                ? 'text-white/25 group-hover:text-white/55'
                : 'text-zinc-300 group-hover:text-zinc-600'
            }
          `}
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative flex min-h-32 flex-col items-start justify-between
        overflow-hidden rounded-2xl border-2 border-gray-300 bg-white p-4 text-left
        transition-all duration-300 focus:outline-none focus:ring-2
        text-zinc-950 shadow-[0_10px_28px_rgba(15,23,42,0.06)]
        hover:-translate-y-1 hover:border-gray-400 hover:bg-zinc-50 hover:shadow-[0_16px_38px_rgba(15,23,42,0.1)]
        focus:ring-zinc-200 ${styles.hover}
      `}
    >
      <span
        className={`
          flex h-12 w-12 items-center justify-center rounded-2xl ring-1
          shadow-sm transition-all duration-300 group-hover:scale-105
          ${styles.iconLight}
        `}
      >
        {icon}
      </span>

      <span>
          <span
            className="block text-sm font-semibold tracking-[-0.03em] text-zinc-950"
          >
            {title}
          </span>

        {description ? (
          <span
            className="mt-2 block max-w-60 text-xs leading-5 text-zinc-500"
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}
