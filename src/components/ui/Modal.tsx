import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
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
  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div className={`fixed inset-0 z-[100] overflow-y-auto ${tone === 'dark' ? 'bg-black/70 backdrop-blur-sm' : 'bg-gray-950/30'}`}>
      <div
        className={`flex min-h-full w-full justify-center p-4 ${
          position === 'center' ? 'items-center' : 'items-start'
        }`}
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
          className={`max-h-[calc(100vh-2rem)] w-full ${sizes[size]} overflow-y-auto rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.35)] ${
            tone === 'dark'
              ? 'bg-[#050505] text-white ring-1 ring-white/10'
              : 'bg-white text-gray-950 shadow-xl'
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
