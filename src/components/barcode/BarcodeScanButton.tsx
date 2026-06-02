import { Barcode } from 'lucide-react'
import { useCallback } from 'react'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { BarcodeScanModal } from './BarcodeScanModal'

interface BarcodeScanButtonProps {
  label?: string
  variant?: 'default' | 'icon' | 'secondary'
  onScan: (code: string) => void | Promise<void>
  helperText?: string
  className?: string
  disabled?: boolean
  tone?: 'light' | 'dark'
  layout?: 'stacked' | 'inline'
}

export function BarcodeScanButton({
  label = 'Ler código',
  variant = 'secondary',
  onScan,
  helperText,
  className,
  disabled,
  tone = 'light',
  layout = 'stacked',
}: BarcodeScanButtonProps) {
  const { open, barcode, setBarcode, openScanner, closeScanner } = useBarcodeScanner()

  const handleScan = useCallback(
    async (code: string) => {
      await Promise.resolve(onScan(code))
    },
    [onScan],
  )

  const buttonVariant = variant === 'default' ? 'primary' : variant === 'icon' ? 'ghost' : 'secondary'
  const buttonHoverClass =
    variant === 'default'
      ? 'shadow-[0_8px_24px_rgba(15,23,42,0.16)] hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-[0_14px_30px_rgba(15,23,42,0.22)] active:translate-y-0'
      : 'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0'

  return (
    <div className={layout === 'inline' ? 'inline-flex items-start gap-2' : 'inline-flex flex-col gap-1'}>
      <Button
        type="button"
        variant={buttonVariant}
        className={cn(
          'group transition-all duration-200 ease-out',
          buttonHoverClass,
          variant === 'icon' ? 'h-10 w-10 px-0' : 'h-10',
          className,
        )}
        aria-label={label}
        disabled={disabled}
        tone={tone}
        onClick={() => openScanner()}
      >
        <Barcode className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
        {variant === 'icon' ? <span className="sr-only">{label}</span> : <span>{label}</span>}
      </Button>
      {helperText ? <p className="text-xs text-gray-500">{helperText}</p> : null}

      <BarcodeScanModal
        open={open}
        value={barcode}
        onValueChange={setBarcode}
        onConfirm={handleScan}
        onClose={closeScanner}
      />
    </div>
  )
}
