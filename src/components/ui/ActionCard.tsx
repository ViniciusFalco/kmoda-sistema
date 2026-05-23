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
          group flex min-h-44 flex-col items-center justify-center gap-4
          rounded-lg border p-5 text-center shadow-sm transition
          hover:-translate-y-0.5 focus:outline-none focus:ring-2
          ${
            isDark
              ? 'border-white/10 bg-[#050505] text-white hover:border-white/20 hover:shadow-md focus:ring-white/25'
              : 'border-gray-200 bg-white text-gray-950 hover:border-gray-300 hover:shadow-md focus:ring-gray-200'
          }
        `}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-md transition group-hover:scale-105 ${
            isDark ? 'bg-white/10 text-white' : 'bg-gray-900 text-white'
          }`}
        >
          {icon}
        </span>

        <span>
          <span
            className={`block text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-950'}`}
          >
            {title}
          </span>

          {description ? (
            <span className={`mt-1 block text-sm leading-6 ${isDark ? 'text-white/55' : 'text-gray-500'}`}>
              {description}
            </span>
          ) : null}
        </span>
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
                border-white/10 bg-white/[0.06] text-white
                shadow-[0_18px_45px_rgba(0,0,0,0.22)]
                backdrop-blur-xl
                hover:-translate-y-0.5 hover:bg-white/[0.09]
                hover:shadow-[0_24px_60px_rgba(0,0,0,0.30)]
                focus:ring-white/20
                ${styles.hover}
              `
              : `
                border-zinc-200 bg-white text-zinc-950
                shadow-[0_14px_35px_rgba(15,23,42,0.08)]
                hover:-translate-y-0.5 hover:bg-zinc-50
                hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]
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
                ? styles.iconDark
                : styles.iconLight
            }
          `}
        >
          {icon}
        </span>

        <span className="relative min-w-0 flex-1">
          <span
            className={`
              block text-sm font-semibold tracking-[-0.02em]
              ${isDark ? 'text-white' : 'text-zinc-950'}
            `}
          >
            {title}
          </span>

          {description ? (
            <span
              className={`
                mt-0.5 block truncate text-xs
                ${isDark ? 'text-white/50' : 'text-zinc-500'}
              `}
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
        group relative flex min-h-44 flex-col items-start justify-between
        overflow-hidden rounded-3xl border p-6 text-left
        transition-all duration-300 focus:outline-none focus:ring-2
        ${
          isDark
            ? `
              border-white/10 bg-white/[0.06] text-white
              shadow-[0_18px_45px_rgba(0,0,0,0.24)]
              backdrop-blur-xl hover:-translate-y-1 hover:bg-white/[0.09]
              hover:shadow-[0_24px_65px_rgba(0,0,0,0.32)]
              focus:ring-white/20 ${styles.hover}
            `
            : `
              border-zinc-200 bg-white text-zinc-950 shadow-sm
              hover:-translate-y-1 hover:bg-zinc-50 hover:shadow-xl
              focus:ring-zinc-200 ${styles.hover}
            `
        }
      `}
    >
      <span
        className={`
          flex h-12 w-12 items-center justify-center rounded-2xl ring-1
          shadow-sm transition-all duration-300 group-hover:scale-105
          ${isDark ? styles.iconDark : styles.iconLight}
        `}
      >
        {icon}
      </span>

      <span>
        <span
          className={`
            block text-lg font-semibold tracking-[-0.03em]
            ${isDark ? 'text-white' : 'text-zinc-950'}
          `}
        >
          {title}
        </span>

        {description ? (
          <span
            className={`
              mt-2 block max-w-60 text-sm leading-5
              ${isDark ? 'text-white/55' : 'text-zinc-500'}
            `}
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}
