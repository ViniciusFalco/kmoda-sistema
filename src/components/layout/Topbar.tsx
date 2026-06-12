import { Eye, LogOut, PackagePlus, ShoppingCart } from 'lucide-react'
import { useCallback, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BarcodeResultModal, type BarcodeLookupResult } from '../barcode/BarcodeResultModal'
import { BarcodeScanButton } from '../barcode/BarcodeScanButton'
import { useAuth } from '../../hooks/useAuth'
import { findBarcodeLookup, findBarcodeLookupByProductId } from '../../lib/catalog'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { QuickSearch } from '../ui/QuickSearch'

const adminNavItems = [
  { label: 'Início', path: '/' },
  { label: 'Caixa', path: '/caixa' },
  { label: 'Estoque', path: '/estoque' },
  { label: 'Produtos', path: '/produtos' },
  { label: 'Clientes', path: '/clientes' },
  { label: 'Usuários', path: '/usuarios' },
  { label: 'Cadastros', path: '/categorias' },
  { label: 'Configurações', path: '/configuracoes' },
  { label: 'Tutoriais', path: '/tutoriais' },
]

const cashierNavItems = [
  { label: 'Caixa', path: '/' },
  { label: 'Produtos', path: '/produtos' },
  { label: 'Clientes', path: '/clientes' },
  { label: 'Tutoriais', path: '/tutoriais' },
]

export function Topbar() {
  const { signOut, isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const [barcodeResult, setBarcodeResult] = useState<BarcodeLookupResult | null>(null)
  const [barcodeResultOpen, setBarcodeResultOpen] = useState(false)
  const [quickSearchValue, setQuickSearchValue] = useState('')

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

  const handleQuickSearchSelect = useCallback(
    async (item: { id: string; type: 'product' | 'customer'; href: string; barcode?: string | null }) => {
      if (item.type === 'product') {
        if (item.barcode) {
          await handleBarcodeScan(item.barcode)
          return
        }

        await handleSelectRelatedProduct({ id: item.id })
        return
      }

      navigate(item.href)
    },
    [handleBarcodeScan, handleSelectRelatedProduct, navigate],
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="w-full">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="KModa" className="h-8 w-auto max-w-[132px] object-contain sm:h-9 sm:max-w-[156px]" />
            <p
              className="text-[15px] font-semibold uppercase tracking-[0.22em] text-gray-950"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              Moda Feminina
            </p>
            <span className="hidden rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600 lg:inline-flex">
              {isAdmin ? 'Admin' : 'Caixa'}
            </span>
            {profile?.name ? (
              <span className="hidden max-w-[180px] truncate rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-600 lg:inline-flex">
                {profile.name}
              </span>
            ) : null}
          </div>

          <div className="hidden min-w-0 justify-self-center lg:flex lg:w-full lg:max-w-3xl">
            <div className="flex w-full items-center gap-3">
              <QuickSearch
                value={quickSearchValue}
                onChange={setQuickSearchValue}
                onSelectResult={handleQuickSearchSelect}
                placeholder="Buscar produto, cliente ou código"
              />
              <BarcodeScanButton label="Código" variant="default" onScan={handleBarcodeScan} className="shrink-0" />
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut()
            }}
            className="ml-auto text-gray-600 hover:bg-gray-100 hover:text-gray-950"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>

        <div className="border-t border-gray-200 bg-gray-50 px-0">
          <div className="flex min-w-max items-stretch overflow-x-auto">
            {(isAdmin ? adminNavItems : cashierNavItems).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'border-r border-gray-200 px-4 py-3 text-sm font-semibold transition sm:px-5',
                    isActive
                      ? 'bg-black !text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-950',
                  )
                }
                style={({ isActive }) => (isActive ? { color: '#fff', backgroundColor: '#000' } : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <QuickSearch
              value={quickSearchValue}
              onChange={setQuickSearchValue}
              onSelectResult={handleQuickSearchSelect}
              placeholder="Buscar produto, cliente ou código"
            />
            <BarcodeScanButton label="Código" variant="default" onScan={handleBarcodeScan} className="shrink-0" />
          </div>
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
                ...(isAdmin
                  ? [
                      {
                        label: 'Atualizar estoque',
                        icon: <PackagePlus className="h-4 w-4" />,
                        variant: 'info' as const,
                        onClick: () => {
                          if (!barcodeResult) {
                            return
                          }

                          closeBarcodeResult()
                          navigate(`/estoque?barcode=${encodeURIComponent(barcodeResult.code)}&auto=1`)
                        },
                      },
                    ]
                  : []),
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
                ...(isAdmin
                  ? [
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
                    ]
                  : []),
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
