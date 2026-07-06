import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '6xl'
  position?: 'center' | 'start'
  tone?: 'light' | 'dark'
  fullScreen?: boolean
  showTitle?: boolean
  bodyClassName?: string
  headerCenter?: ReactNode
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
}

export function Modal({
  open,
  title,
  children,
  onClose,
  size = '2xl',
  position = 'center',
  tone = 'light',
  fullScreen = false,
  showTitle = true,
  bodyClassName,
  headerCenter,
}: ModalProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing' | 'closed'>(open ? 'open' : 'closed')
  const entryFrameRef = useRef<number | null>(null)
  const exitTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (entryFrameRef.current !== null) {
      window.cancelAnimationFrame(entryFrameRef.current)
      entryFrameRef.current = null
    }

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current)
      exitTimerRef.current = null
    }

    if (open) {
      entryFrameRef.current = window.requestAnimationFrame(() => {
        setShouldRender(true)
        setPhase('opening')

        entryFrameRef.current = window.requestAnimationFrame(() => {
          setPhase('open')
          entryFrameRef.current = null
        })
      })
    } else if (shouldRender) {
      entryFrameRef.current = window.requestAnimationFrame(() => {
        setPhase('closing')
        exitTimerRef.current = window.setTimeout(() => {
          setShouldRender(false)
          setPhase('closed')
          exitTimerRef.current = null
        }, 260)
      })
    }

    return undefined
  }, [open, shouldRender])

  useEffect(() => {
    return () => {
      if (entryFrameRef.current !== null) {
        window.cancelAnimationFrame(entryFrameRef.current)
      }
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
      }
    }
  }, [])

  if (!shouldRender || typeof document === 'undefined') {
    return null
  }

  const isEntering = phase === 'opening'
  const isOpen = phase === 'open'

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        tone === 'dark' ? 'bg-gray-950/45 backdrop-blur-sm' : 'bg-gray-900/20 backdrop-blur-[2px]'
      } ${fullScreen ? 'overflow-hidden' : 'overflow-y-auto'} ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={phase !== 'open'}
    >
      <div
        className={`flex min-h-full w-full transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          fullScreen
            ? 'items-stretch justify-center p-2 sm:p-4'
            : `justify-center p-4 ${position === 'center' ? 'items-center' : 'items-start'}`
        } ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose()
          }
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
        }}
      >
        <div
          className={`kmoda-scrollbar w-full transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            fullScreen
              ? 'flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-2xl border-2 border-gray-200 shadow-[0_30px_90px_rgba(0,0,0,0.18)] sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]'
              : `max-h-[calc(100vh-2rem)] ${sizes[size]} overflow-y-scroll rounded-2xl border-2 border-gray-200 shadow-[0_30px_90px_rgba(0,0,0,0.28)]`
          } ${
            tone === 'dark'
              ? 'bg-white text-gray-950 ring-0'
              : 'bg-white text-gray-950 shadow-xl ring-0'
          } ${
            isOpen
              ? 'translate-y-0 scale-100 opacity-100'
              : isEntering
                ? 'translate-y-6 scale-[0.96] opacity-0'
                : 'translate-y-4 scale-[0.98] opacity-0'
          }`}
        >
          <div
            className={`sticky top-0 z-10 grid items-center gap-3 border-b-2 px-5 py-4 ${
              tone === 'dark' ? 'border-gray-200 bg-white' : 'border-gray-200 bg-white'
            }`}
            style={{
              gridTemplateColumns: showTitle
                ? headerCenter
                  ? 'minmax(0,1fr) minmax(0,1.2fr) auto'
                  : 'minmax(0,1fr) auto'
                : 'minmax(0,1fr) auto',
            }}
          >
            {showTitle ? (
              <h2 className="min-w-0 break-words text-sm font-semibold uppercase tracking-[0.18em] leading-tight text-gray-950 sm:text-base">
                {title}
              </h2>
            ) : null}
            {headerCenter ? (
              <div className="min-w-0 justify-self-center overflow-hidden text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 sm:text-[11px]">
                <div className="truncate max-w-[48vw] sm:max-w-[40rem]">{headerCenter}</div>
              </div>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fechar modal"
              tone="light"
              className="h-11 w-11 justify-self-end rounded-full border-2 border-gray-200 bg-gray-50 px-0 text-gray-600 transition hover:border-gray-900 hover:bg-white hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className={`text-gray-900 ${fullScreen ? 'flex-1 min-h-0 overflow-hidden' : ''} ${bodyClassName ?? 'p-4 sm:p-5'}`}>{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
