import { useCallback, useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { Table } from '../../components/ui/Table'
import {
  createStockMovement,
  friendlyCatalogError,
  listProducts,
  listStockMovements,
} from '../../lib/catalog'
import type { Product, StockMovement } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import { StockMovementForm, type StockMovementFormValues } from './StockMovementForm'

export function StockPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Registrar movimentação" description="Entradas, saídas e ajustes manuais de estoque.">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <StockMovementForm products={products} submitting={submitting} onSubmit={handleSubmit} />
      </Card>

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
                    <p className="font-medium text-gray-950">{movement.product?.name ?? '-'}</p>
                    <p className="text-xs text-gray-500">
                      {[
                        movement.product?.brand?.name,
                        movement.product?.clothing_type?.name,
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
              { key: 'reason', header: 'Motivo', render: (movement) => movement.reason.replace('_', ' ') },
              { key: 'quantity', header: 'Qtd.', render: (movement) => movement.quantity },
              { key: 'notes', header: 'Observação', render: (movement) => movement.notes ?? '-' },
            ]}
          />
        )}
      </Card>
    </div>
  )
}
