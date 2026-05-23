import { Barcode, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isValidBarcode, normalizeBarcode } from '../../lib/barcode'

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
  const closeTimeoutRef = useRef<number | null>(null)
  const openFrameRef = useRef<number | null>(null)
  const [isRendered, setIsRendered] = useState(open)
  const [phase, setPhase] = useState<'enter' | 'open' | 'exit'>(open ? 'open' : 'exit')
  const [error, setError] = useState('')

  const normalizedCode = useMemo(() => normalizeBarcode(value), [value])
  const hasCode = Boolean(normalizedCode)
  const canConfirm = isValidBarcode(normalizedCode)

  useEffect(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }

    if (openFrameRef.current !== null) {
      window.cancelAnimationFrame(openFrameRef.current)
      openFrameRef.current = null
    }

    const frame = window.requestAnimationFrame(() => {
      if (open) {
        setIsRendered(true)
        setPhase('enter')
        setError('')

        openFrameRef.current = window.requestAnimationFrame(() => {
          setPhase('open')
          inputRef.current?.focus()
          inputRef.current?.select()
          openFrameRef.current = null
        })
        return
      }

      if (!isRendered) {
        setError('')
        return
      }

      setPhase('exit')
      closeTimeoutRef.current = window.setTimeout(() => {
        setIsRendered(false)
        setError('')
        closeTimeoutRef.current = null
      }, 180)
    })

    return () => {
      window.cancelAnimationFrame(frame)

      if (openFrameRef.current !== null) {
        window.cancelAnimationFrame(openFrameRef.current)
        openFrameRef.current = null
      }
    }
  }, [isRendered, open])

  function closeModal() {
    setError('')
    onClose()
  }

  async function confirmScan() {
    const code = normalizeBarcode(value)

    if (!isValidBarcode(code)) {
      setError('Código inválido.')
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

  if (!isRendered || typeof document === 'undefined') {
    return null
  }

  const isExiting = phase === 'exit'

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      style={{
        animation: `barcodeModalBackdrop ${isExiting ? '180ms' : '220ms'} ease-${isExiting ? 'in' : 'out'} both`,
      }}
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
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#050505] text-white shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
        style={{
          animation: `barcodeModalCard ${isExiting ? '180ms' : '240ms'} cubic-bezier(${isExiting ? '0.2, 0, 0.38, 0.9' : '0.16, 1, 0.3, 1'}) both`,
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

        <button
          type="button"
          onClick={closeModal}
          aria-label="Fechar modal"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/60 transition hover:bg-white/[0.08] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-7 pb-7 pt-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.18)]">
            <Barcode className="h-6 w-6" />
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">
              Leitura de código
            </h2>

            <p className="mt-2 text-sm text-white/45">
              {hasCode ? 'Código capturado.' : 'Aguardando escaneamento'}
            </p>
          </div>

          <div className="mt-7">
            <div className="relative mx-auto flex h-20 max-w-xs items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex h-10 items-center gap-[5px]">
                {Array.from({ length: 22 }).map((_, index) => (
                  <span
                    key={index}
                    className="block rounded-full bg-white/80"
                    style={{
                      width: index % 4 === 0 ? 3 : index % 3 === 0 ? 2 : 1,
                      height: index % 5 === 0 ? 38 : index % 2 === 0 ? 30 : 22,
                      opacity: hasCode ? 0.9 : 0.35,
                    }}
                  />
                ))}
              </div>

              {!hasCode ? (
                <span className="absolute inset-y-3 left-0 w-16 animate-[scanner_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/35">
                Código
              </p>

              <p className="mt-2 min-h-6 font-mono text-base tracking-[0.08em] text-white">
                {normalizedCode || '••••••••••••'}
              </p>
            </div>
          </div>

          <input
            ref={inputRef}
            value={value}
            autoFocus
            autoComplete="off"
            inputMode="text"
            spellCheck={false}
            aria-label="Código de barras"
            className="sr-only"
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

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="h-11 rounded-2xl border border-white/10 bg-white/[0.03] text-sm font-medium text-white/65 transition hover:bg-white/[0.07] hover:text-white"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => void confirmScan()}
              disabled={!canConfirm}
              className="h-11 rounded-2xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
            >
              Confirmar
            </button>
          </div>
        </div>

        <style>
          {`
            @keyframes barcodeModalBackdrop {
              from {
                opacity: 0;
              }

              to {
                opacity: 1;
              }
            }

            @keyframes barcodeModalCard {
              from {
                opacity: 0;
                transform: translateY(14px) scale(0.98);
              }

              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes scanner {
              0% {
                transform: translateX(-120%);
                opacity: 0;
              }

              20% {
                opacity: 1;
              }

              80% {
                opacity: 1;
              }

              100% {
                transform: translateX(420%);
                opacity: 0;
              }
            }
          `}
        </style>
      </div>
    </div>,
    document.body,
  )
}
