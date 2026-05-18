import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '6xl'
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

export function Modal({ open, title, children, onClose, size = '2xl' }: ModalProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/30 p-4">
      <div className={`max-h-[92vh] w-full ${sizes[size]} overflow-y-auto rounded-lg bg-white shadow-xl`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <h2 className="text-base font-semibold text-gray-950">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fechar modal">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
