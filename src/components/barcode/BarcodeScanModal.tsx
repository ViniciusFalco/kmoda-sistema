import { Barcode, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isValidBarcode, normalizeBarcode } from '../../lib/barcode'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

interface BarcodeScanModalProps {
  open: boolean
  value: string
  onValueChange: (value: string) => void
  onConfirm: (code: string) => void | Promise<void>
  onClose: () => void
}

export function BarcodeScanModal({
  open,
  value,
  onValueChange,
  onConfirm,
  onClose,
}: BarcodeScanModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setError('')
      return
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  function closeModal() {
    setError('')
    onClose()
  }

  async function confirmScan() {
    const code = normalizeBarcode(value)

    if (!isValidBarcode(code)) {
      setError('Digite ou leia um código válido.')
      window.requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
      return
    }

    setError('')

    try {
      await Promise.resolve(onConfirm(code))
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar a leitura.')
    }
  }

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeModal()
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          closeModal()
        }
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-2xl ring-1 ring-black/5">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-900 text-white">
              <Barcode className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-950">Ler código de barras</h2>
              <p className="mt-1 text-sm text-gray-500">
                Aponte o leitor para a etiqueta. O código será preenchido automaticamente.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={closeModal} aria-label="Fechar modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <Input
            ref={inputRef}
            label="Código de barras"
            value={value}
            autoFocus
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
            onChange={(event) => {
              setError('')
              onValueChange(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void confirmScan()
              }

              if (event.key === 'Escape') {
                event.preventDefault()
                closeModal()
              }
            }}
          />

          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Código lido</p>
            <p className="mt-1 font-mono text-base text-gray-950">
              {normalizeBarcode(value) || 'Aguardando leitura...'}
            </p>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={() => void confirmScan()} disabled={!isValidBarcode(value)}>
              Confirmar
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
