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
}

export function BarcodeScanButton({
  label = 'Ler código',
  variant = 'secondary',
  onScan,
  helperText,
  className,
  disabled,
}: BarcodeScanButtonProps) {
  const { open, barcode, setBarcode, openScanner, closeScanner } = useBarcodeScanner()

  const handleScan = useCallback(
    async (code: string) => {
      await Promise.resolve(onScan(code))
    },
    [onScan],
  )

  const buttonVariant = variant === 'default' ? 'primary' : variant === 'icon' ? 'ghost' : 'secondary'

  return (
    <div className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant={buttonVariant}
        className={cn(
          variant === 'icon' ? 'h-10 w-10 px-0' : 'h-10',
          className,
        )}
        aria-label={label}
        disabled={disabled}
        onClick={() => openScanner()}
      >
        <Barcode className="h-4 w-4" />
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
