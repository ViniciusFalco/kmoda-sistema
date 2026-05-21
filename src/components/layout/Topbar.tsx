import { Menu } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarcodeResultModal, type BarcodeLookupResult } from '../barcode/BarcodeResultModal'
import { BarcodeScanButton } from '../barcode/BarcodeScanButton'
import { useDisplayName } from '../../hooks/useAppSettings'
import { findBarcodeLookup } from '../../lib/catalog'
import { getGreeting } from '../../lib/appSettings'
import { Button } from '../ui/Button'
import { QuickSearch } from '../ui/QuickSearch'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const displayName = useDisplayName()
  const greeting = getGreeting()
  const navigate = useNavigate()
  const [barcodeResult, setBarcodeResult] = useState<BarcodeLookupResult | null>(null)
  const [barcodeResultOpen, setBarcodeResultOpen] = useState(false)

  const handleBarcodeScan = useCallback(async (code: string) => {
    try {
      setBarcodeResult(await findBarcodeLookup(code))
    } catch {
      setBarcodeResult({ kind: 'not_found', code })
    }

    setBarcodeResultOpen(true)
  }, [])

  const closeBarcodeResult = useCallback(() => {
    setBarcodeResultOpen(false)
    setBarcodeResult(null)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white/95 px-4 backdrop-blur lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="secondary"
          size="md"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
          Menu
        </Button>
        <div className="flex min-w-0 items-center">
          <img
            src="/logo.png"
            alt="KModa"
            className="h-9 w-auto max-w-[140px] object-contain"
          />
        </div>
      </div>

      <div className="hidden flex-1 items-start justify-center gap-3 lg:flex">
        <QuickSearch placeholder="Buscar produto, cliente ou código" />
        <BarcodeScanButton
          label="Ler código"
          variant="secondary"
          onScan={handleBarcodeScan}
          className="shrink-0"
        />
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-sm font-medium text-gray-800">
          {greeting}, {displayName}
        </p>
      </div>

      <BarcodeResultModal
        open={barcodeResultOpen}
        result={barcodeResult}
        onClose={closeBarcodeResult}
        actions={
          barcodeResult?.kind === 'found'
            ? [
                {
                  label: 'Ver produto',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    closeBarcodeResult()
                    navigate(`/produtos?q=${encodeURIComponent(barcodeResult.code)}`)
                  },
                },
                {
                  label: 'Atualizar estoque',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    closeBarcodeResult()
                    navigate(`/estoque?barcode=${encodeURIComponent(barcodeResult.code)}&auto=1`)
                  },
                },
                {
                  label: 'Nova venda com este produto',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    closeBarcodeResult()
                    navigate(`/caixa?acao=nova-venda&barcode=${encodeURIComponent(barcodeResult.code)}`)
                  },
                },
                {
                  label: 'Fechar',
                  variant: 'secondary',
                  onClick: closeBarcodeResult,
                },
              ]
            : [
                {
                  label: 'Cadastrar produto com este código',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    closeBarcodeResult()
                    navigate(`/produtos?create=1&barcode=${encodeURIComponent(barcodeResult.code)}`)
                  },
                },
                {
                  label: 'Fechar',
                  variant: 'secondary',
                  onClick: closeBarcodeResult,
                },
              ]
        }
      />
    </header>
  )
}
