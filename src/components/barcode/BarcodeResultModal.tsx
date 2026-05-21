import type { ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { BarcodeLookupResult } from '../../lib/catalog'
import { formatCurrencyBRL } from '../../lib/utils'
export type { BarcodeLookupResult } from '../../lib/catalog'

export interface BarcodeResultAction {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

interface BarcodeResultModalProps {
  open: boolean
  result: BarcodeLookupResult | null
  onClose: () => void
  actions?: BarcodeResultAction[]
}

export function BarcodeResultModal({ open, result, onClose, actions }: BarcodeResultModalProps) {
  const resolvedActions = actions ?? [{ label: 'Fechar', onClick: onClose, variant: 'secondary' }]

  if (!result) {
    return null
  }

  const title = result.kind === 'found' ? 'Código encontrado' : 'Código não encontrado no estoque'

  return (
    <Modal open={open} title={title} onClose={onClose} size="6xl" position="start">
      <div className="space-y-5">
        {result.kind === 'found' ? (
          <>
            <section className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Produto escaneado</p>
                  <h3 className="mt-1 text-xl font-semibold text-gray-950">{result.product.product_model?.name ?? result.product.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Ref.: {result.product.product_model?.reference || result.product.reference || '-'}
                  </p>
                </div>
                <Badge variant={result.product.stock_quantity > 0 ? 'success' : 'warning'}>
                  {result.product.stock_quantity > 0 ? 'Em estoque' : 'Sem estoque'}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoRow label="Código lido" value={result.code} mono />
                <InfoRow label="Cor" value={result.product.color?.name ?? '-'} />
                <InfoRow label="Tamanho" value={result.product.size?.name ?? '-'} />
                <InfoRow label="Quantidade" value={`${result.product.stock_quantity} unidade${result.product.stock_quantity === 1 ? '' : 's'}`} />
                <InfoRow label="Família" value={result.product.product_model?.family ?? '-'} />
                <InfoRow label="Marca" value={result.product.product_model?.brand?.name ?? result.product.brand?.name ?? '-'} />
                <InfoRow label="Categoria" value={result.product.product_model?.category?.name ?? result.product.clothing_type?.name ?? '-'} />
                <InfoRow label="Preço" value={formatCurrencyBRL(result.product.sale_price)} />
              </div>
            </section>

            <ResultsSection
              title="Mesmo modelo em estoque"
              emptyMessage="Nenhuma variação encontrada para a mesma referência."
              items={result.sameModelVariants}
              renderItem={(product) => (
                <>
                  <span>{product.color?.name ?? '-'}</span>
                  <span>{product.size?.name ?? '-'}</span>
                  <span>{product.stock_quantity} unidade{product.stock_quantity === 1 ? '' : 's'}</span>
                  <span className="text-gray-500">{product.stock_quantity > 0 ? 'Com estoque' : 'Sem estoque'}</span>
                </>
              )}
            />

            <ResultsSection
              title="Sugestões semelhantes em estoque"
              emptyMessage="Nenhuma sugestão encontrada."
              items={result.suggestions}
              renderItem={(product) => (
                <>
                  <span className="font-medium text-gray-950">{product.product_model?.name ?? product.name}</span>
                  <span>Ref.: {product.product_model?.reference || product.reference || '-'}</span>
                  <span>{product.color?.name ?? '-'}</span>
                  <span>{product.size?.name ?? '-'}</span>
                  <span>{product.stock_quantity} unidade{product.stock_quantity === 1 ? '' : 's'}</span>
                </>
              )}
            />
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Código não encontrado no estoque.</p>
            <p className="mt-1">
              Nenhum produto cadastrado com o código <span className="font-mono font-semibold">{result.code}</span>.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {resolvedActions.map((action) => (
            <ActionButton key={action.label} action={action} />
          ))}
        </div>
      </div>
    </Modal>
  )
}

function ResultsSection({
  title,
  items,
  emptyMessage,
  renderItem,
}: {
  title: string
  items: Array<{ id: string }>
  emptyMessage: string
  renderItem: (item: any) => ReactNode
}) {
  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-400">{title}</h4>
        <Badge variant="neutral">{items.length}</Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-700 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.9fr] sm:items-center"
            >
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ActionButton({ action }: { action: BarcodeResultAction }) {
  const variant = action.variant ?? 'secondary'
  return (
    <Button variant={variant === 'primary' ? 'primary' : variant} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-md border border-gray-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={mono ? 'mt-1 truncate font-mono text-sm font-medium text-gray-950' : 'mt-1 truncate text-sm font-medium text-gray-950'}>
        {value}
      </p>
    </div>
  )
}
