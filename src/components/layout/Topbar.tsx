import { Eye, Menu, PackagePlus, ShoppingCart } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarcodeResultModal, type BarcodeLookupResult } from '../barcode/BarcodeResultModal'
import { BarcodeScanButton } from '../barcode/BarcodeScanButton'
import { useDisplayName } from '../../hooks/useAppSettings'
import { findBarcodeLookup, findBarcodeLookupByProductId } from '../../lib/catalog'
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

  const handleSelectRelatedProduct = useCallback(
    async (product: { id: string }) => {
      try {
        const relatedResult = await findBarcodeLookupByProductId(product.id)

        if (relatedResult) {
          setBarcodeResult(relatedResult)
          setBarcodeResultOpen(true)
        }
      } catch {
        // Keep the current modal open if reloading the selected product fails.
      }
    },
    [],
  )

  return (
    <header className="sticky top-0 z-30 w-full px-2 pt-2 sm:px-3 lg:px-4 xl:px-5">
      <div className="flex h-16 items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white/90 px-4 shadow-[0_12px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/logo.png"
              alt="KModa"
              className="h-9 w-auto max-w-[140px] object-contain"
            />
            <span
              className="whitespace-nowrap text-[11px] font-bold italic leading-none text-gray-900 sm:text-sm"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              MODA FEMININA
            </span>
          </div>
        </div>

        <div className="hidden flex-1 items-start justify-center gap-3 lg:flex">
          <QuickSearch placeholder="Buscar produto, cliente ou código" />
          <BarcodeScanButton
            label="Código"
            variant="default"
            onScan={handleBarcodeScan}
            className="shrink-0"
          />
        </div>

        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-sm font-medium text-gray-800">
            {greeting}, {displayName}
          </p>
        </div>
      </div>

      <BarcodeResultModal
        open={barcodeResultOpen}
        result={barcodeResult}
        onClose={closeBarcodeResult}
        onSelectRelatedProduct={handleSelectRelatedProduct}
        actions={
          barcodeResult?.kind === 'found'
            ? [
                {
                  label: 'Ver produto',
                  icon: <Eye className="h-4 w-4" />,
                  variant: 'light',
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
                  icon: <PackagePlus className="h-4 w-4" />,
                  variant: 'info',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    closeBarcodeResult()
                    navigate(`/estoque?barcode=${encodeURIComponent(barcodeResult.code)}&auto=1`)
                  },
                },
                {
                  label: 'Nova venda',
                  icon: <ShoppingCart className="h-4 w-4" />,
                  variant: 'success',
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
