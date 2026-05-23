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

export function Modal({ open, title, children, onClose, size = '2xl', position = 'center', tone = 'light' }: ModalProps) {
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
      setShouldRender(true)
      setPhase('opening')

      entryFrameRef.current = window.requestAnimationFrame(() => {
        entryFrameRef.current = window.requestAnimationFrame(() => {
          setPhase('open')
          entryFrameRef.current = null
        })
      })
    } else if (shouldRender) {
      setPhase('closing')
      exitTimerRef.current = window.setTimeout(() => {
        setShouldRender(false)
        setPhase('closed')
        exitTimerRef.current = null
      }, 260)
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
      className={`fixed inset-0 z-[100] overflow-y-auto transition-opacity duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        tone === 'dark' ? 'bg-black/70 backdrop-blur-sm' : 'bg-gray-950/30'
      } ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={phase !== 'open'}
    >
      <div
        className={`flex min-h-full w-full justify-center p-4 transition-[opacity,transform] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          position === 'center' ? 'items-center' : 'items-start'
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
          className={`max-h-[calc(100vh-2rem)] w-full ${sizes[size]} overflow-y-auto rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.35)] transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            tone === 'dark'
              ? 'bg-[#050505] text-white ring-1 ring-white/10'
              : 'bg-white text-gray-950 shadow-xl'
          } ${
            isOpen
              ? 'translate-y-0 scale-100 opacity-100'
              : isEntering
                ? 'translate-y-6 scale-[0.96] opacity-0'
                : 'translate-y-4 scale-[0.98] opacity-0'
          }`}
        >
          <div
            className={`sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4 ${
              tone === 'dark'
                ? 'border-white/10 bg-[#050505]'
                : 'border-gray-100 bg-white'
            }`}
          >
            <h2 className={`text-base font-semibold ${tone === 'dark' ? 'text-white' : 'text-gray-950'}`}>{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Fechar modal"
              tone={tone === 'dark' ? 'dark' : 'light'}
              className={tone === 'dark' ? 'text-white/70 hover:bg-white/10 hover:text-white' : undefined}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className={tone === 'dark' ? 'p-5 text-white' : 'p-5'}>{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
