import { ClipboardList, PackagePlus, Search, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BarcodeResultModal, type BarcodeLookupResult } from '../../components/barcode/BarcodeResultModal'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Table } from '../../components/ui/Table'
import {
  findBarcodeLookup,
  findProductByBarcode,
  createStockMovement,
  friendlyCatalogError,
  listProducts,
  listStockMovements,
} from '../../lib/catalog'
import { formatDateBR } from '../../lib/utils'
import type { Product, StockMovement, StockMovementReason, StockMovementType } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { StockMovementForm, type StockMovementFormValues } from './StockMovementForm'

interface MovementPreset {
  title: string
  type: StockMovementType
  reason: StockMovementReason
}

export function StockPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [movementPreset, setMovementPreset] = useState<MovementPreset | null>(null)
  const [movementProductId, setMovementProductId] = useState('')
  const [barcodeResult, setBarcodeResult] = useState<BarcodeLookupResult | null>(null)

  const autoMovementBarcode = searchParams.get('barcode') ?? ''
  const autoOpenMovement = searchParams.get('auto') === '1'

  const filteredProducts = useMemo(() => {
    const term = productQuery.trim().toLowerCase()

    if (!term) {
      return products.slice(0, 6)
    }

    return products
      .filter((product) =>
        [
          product.name,
          product.barcode,
          product.reference,
          product.product_model?.name,
          product.product_model?.reference,
          product.product_model?.family,
          product.product_model?.brand?.name ?? product.brand?.name,
          product.product_model?.category?.name ?? product.clothing_type?.name,
          product.size?.name,
          product.color?.name,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      )
      .slice(0, 8)
  }, [productQuery, products])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [productRows, movementRows] = await Promise.all([
        listProducts({ active: true }),
        listStockMovements(),
      ])
      setProducts(productRows)
      setMovements(movementRows)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const openMovementForProduct = useCallback((productId: string) => {
    setMovementProductId(productId)
    setMovementPreset({ title: 'Atualizar estoque', type: 'entrada', reason: 'ajuste_manual' })
  }, [])

  const handleSearchBarcodeScan = useCallback(async (code: string) => {
    setError('')

    try {
      setBarcodeResult(await findBarcodeLookup(code))
    } catch (err) {
      setError(friendlyCatalogError(err))
    }
  }, [])

  const handleMovementBarcodeScan = useCallback(
    async (code: string) => {
      setError('')

      try {
        const product = await findProductByBarcode(code)

        if (!product) {
          setError('Produto não encontrado para este código.')
          return
        }

        openMovementForProduct(product.id)
      } catch (err) {
        setError(friendlyCatalogError(err))
      }
    },
    [openMovementForProduct],
  )

  const closeBarcodeResult = useCallback(() => {
    setBarcodeResult(null)
  }, [])

  useEffect(() => {
    if (!autoOpenMovement || !autoMovementBarcode) {
      return
    }

    void handleMovementBarcodeScan(autoMovementBarcode)
  }, [autoMovementBarcode, autoOpenMovement, handleMovementBarcodeScan])

  useEffect(() => {
    let active = true

    async function loadInitial() {
      try {
        const [productRows, movementRows] = await Promise.all([
          listProducts({ active: true }),
          listStockMovements(),
        ])
        if (active) {
          setProducts(productRows)
          setMovements(movementRows)
        }
      } catch (err) {
        if (active) {
          setError(friendlyCatalogError(err))
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadInitial()

    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(values: StockMovementFormValues) {
    if (!values.product_id) {
      setError('Selecione um produto.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createStockMovement({
        productId: values.product_id,
        type: values.type,
        reason: values.reason,
        quantity: Number(values.quantity),
        notes: values.notes,
        user,
      })
      await loadData()
      setMovementPreset(null)
      setMovementProductId('')
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  function closeMovementModal() {
    setMovementPreset(null)
    setMovementProductId('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-950">Estoque</h1>
            <p className="mt-1 text-sm text-gray-500">Consulte peças e registre entradas, perdas, trocas ou ajustes controlados.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Button
              onClick={() => {
                setMovementProductId('')
                setMovementPreset({ title: 'Entrada de produto', type: 'entrada', reason: 'compra' })
              }}
            >
              <PackagePlus className="h-4 w-4" />
              Entrada
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setMovementProductId('')
                setMovementPreset({ title: 'Ajuste manual', type: 'entrada', reason: 'ajuste_manual' })
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Ajuste
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setMovementProductId('')
                setMovementPreset({ title: 'Registrar perda', type: 'saida', reason: 'perda' })
              }}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Perda
            </Button>
            <Button variant="secondary" onClick={() => document.getElementById('stock-search')?.focus()}>
              <Search className="h-4 w-4" />
              Consultar
            </Button>
            <BarcodeScanButton label="Ler código" variant="secondary" onScan={handleSearchBarcodeScan} />
          </div>
        </div>
      </div>

      <Card
        title="Consultar produto"
        description="Busque por nome, código de barras, marca, tipo, cor ou tamanho."
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <Input
            id="stock-search"
            className="h-12 pl-10 text-base"
            placeholder="Digite nome, código de barras, marca, tipo, cor ou tamanho"
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table
            data={filteredProducts}
            emptyMessage={loading ? 'Carregando produtos...' : 'Nenhum produto encontrado.'}
            columns={[
              {
                key: 'product',
                header: 'Produto',
                render: (product) => (
                  <div>
                    <p className="font-medium text-gray-950">{product.product_model?.name ?? product.name}</p>
                    <p className="text-xs text-gray-500">
                      {[
                        product.product_model?.reference,
                        product.barcode,
                        product.product_model?.family,
                        product.product_model?.brand?.name ?? product.brand?.name,
                        product.product_model?.category?.name ?? product.clothing_type?.name,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Sem código de barras'}
                    </p>
                  </div>
                ),
              },
              { key: 'brand', header: 'Marca', render: (product) => product.product_model?.brand?.name ?? product.brand?.name ?? '-' },
              { key: 'type', header: 'Tipo', render: (product) => product.product_model?.category?.name ?? product.clothing_type?.name ?? '-' },
              { key: 'size', header: 'Tamanho', render: (product) => product.size?.name ?? '-' },
              { key: 'color', header: 'Cor', render: (product) => product.color?.name ?? '-' },
              {
                key: 'stock',
                header: 'Estoque',
                render: (product) => (
                  <span className={product.stock_quantity <= product.min_stock ? 'font-semibold text-red-700' : 'text-gray-700'}>
                    {product.stock_quantity}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </Card>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <Card title="Histórico de movimentações">
        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
            Carregando movimentações...
          </div>
        ) : (
          <Table
            data={movements}
            columns={[
              {
                key: 'product',
                header: 'Produto',
                render: (movement) => (
                  <div>
                    <p className="font-medium text-gray-950">{movement.product?.product_model?.name ?? movement.product?.name ?? '-'}</p>
                    <p className="text-xs text-gray-500">
                      {[
                        movement.product?.product_model?.reference,
                        movement.product?.barcode,
                        movement.product?.product_model?.family,
                        movement.product?.product_model?.brand?.name ?? movement.product?.brand?.name,
                        movement.product?.product_model?.category?.name ?? movement.product?.clothing_type?.name,
                        movement.product?.size?.name,
                        movement.product?.color?.name,
                      ]
                        .filter(Boolean)
                        .join(' • ') || movement.product?.barcode || '-'}
                    </p>
                  </div>
                ),
              },
              { key: 'type', header: 'Tipo', render: (movement) => (movement.type === 'entrada' ? 'Entrada' : 'Saída') },
              {
                key: 'reason',
                header: 'Motivo',
                render: (movement) => (movement.reason === 'venda' ? 'Venda pelo caixa' : movement.reason.replace('_', ' ')),
              },
              { key: 'quantity', header: 'Qtd.', render: (movement) => movement.quantity },
              { key: 'date', header: 'Data', render: (movement) => formatDateBR(movement.created_at) },
              {
                key: 'cash',
                header: 'Lançamento',
                render: (movement) => movement.cash_movement?.movement_code ?? movement.sale_id?.slice(0, 8).toUpperCase() ?? '-',
              },
              { key: 'notes', header: 'Observação', render: (movement) => movement.notes ?? '-' },
            ]}
          />
        )}
      </Card>

      <Modal
        open={movementPreset !== null}
        title={movementPreset?.title ?? 'Movimentação de estoque'}
        onClose={closeMovementModal}
        size="5xl"
      >
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
          <ClipboardList className="h-4 w-4 text-gray-500" />
          Selecione o produto, confirme a quantidade e registre a movimentação. Vendas devem ser registradas pelo Caixa.
        </div>
        <StockMovementForm
          products={products}
          submitting={submitting}
          defaultType={movementPreset?.type}
          defaultReason={movementPreset?.reason}
          initialProductId={movementProductId}
          onBarcodeScan={handleMovementBarcodeScan}
          onSubmit={handleSubmit}
        />
      </Modal>

      <BarcodeResultModal
        open={barcodeResult !== null}
        result={barcodeResult}
        onClose={closeBarcodeResult}
        actions={
          barcodeResult?.kind === 'found'
            ? [
                {
                  label: 'Atualizar estoque',
                  onClick: () => {
                    if (!barcodeResult) {
                      return
                    }

                    openMovementForProduct(barcodeResult.product.id)
                    closeBarcodeResult()
                  },
                },
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
    </div>
  )
}
