import { useCallback, useState } from 'react'
import { normalizeBarcode } from '../lib/barcode'

export function useBarcodeScanner() {
  const [open, setOpen] = useState(false)
  const [barcode, setBarcode] = useState('')

  const openScanner = useCallback((initialBarcode = '') => {
    setBarcode(normalizeBarcode(initialBarcode))
    setOpen(true)
  }, [])

  const closeScanner = useCallback(() => {
    setOpen(false)
    setBarcode('')
  }, [])

  return {
    open,
    barcode,
    setBarcode,
    openScanner,
    closeScanner,
  }
}
