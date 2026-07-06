import { AlertTriangle, Package, Layers3, Hash } from 'lucide-react'
import { useState } from 'react'
import { PinCodeInput } from '../../components/auth/PinCodeInput'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import type { Product } from '../../types/database'
import type { ProductDeleteImpact } from '../../lib/catalog'

interface ProductDeleteModalProps {
  open: boolean
  product: Product | null
  impact: ProductDeleteImpact | null
  loadingImpact?: boolean
  submitting?: boolean
  error?: string
  onClose: () => void
  onConfirm: (pin: string) => Promise<void> | void
}

function formatCount(value: number) {
  return value.toLocaleString('pt-BR')
}

export function ProductDeleteModal({
  open,
  product,
  impact,
  loadingImpact = false,
  submitting = false,
  error = '',
  onClose,
  onConfirm,
}: ProductDeleteModalProps) {
  const [pin, setPin] = useState('')

  if (!product) {
    return null
  }

  const displayName = product.product_model?.name ?? product.name ?? ''

  const categoryItems = [
    { label: 'Marca', value: product.product_model?.brand?.name ?? product.brand?.name ?? '-' },
    { label: 'Tipo', value: product.product_model?.category?.name ?? product.clothing_type?.name ?? '-' },
    { label: 'Tamanho', value: product.size?.name ?? '-' },
    { label: 'Cor', value: product.color?.name ?? '-' },
    { label: 'Referência', value: product.product_model?.reference ?? product.reference ?? '-' },
  ]

  const totalRelated = impact?.total_related_count ?? 0

  return (
    <Modal open={open} title="Excluir produto" onClose={onClose} size="2xl" position="center">
      <div className="space-y-6">
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Deseja realmente excluir o produto?</p>
              <p className="text-sm leading-6 text-amber-900/90">
                Os vínculos com registros relacionados serão removidos, mas o histórico será preservado nas tabelas
                financeiras e de estoque.
              </p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Package className="mt-1 h-5 w-5 shrink-0 text-gray-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Produto</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-950">{displayName}</h3>
                <p className="text-sm text-gray-600">
                  {product.description?.trim() ? product.description : 'Sem descrição cadastrada.'}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {categoryItems.map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">{item.label}</p>
                  <p className="mt-1 truncate text-sm font-medium text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Layers3 className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.16em]">Registros relacionados</p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">Itens de venda</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">
                  {loadingImpact ? '...' : formatCount(impact?.sale_items_count ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">Movimentações de estoque</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">
                  {loadingImpact ? '...' : formatCount(impact?.stock_movements_count ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p className="text-xs text-gray-500">Total de vínculos</p>
                <p className="mt-1 text-2xl font-semibold text-gray-950">
                  {loadingImpact ? '...' : formatCount(totalRelated)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void onConfirm(pin)
          }}
        >
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <PinCodeInput
              label="Senha/PIN de administrador"
              description="Digite o PIN do administrador para confirmar a exclusão."
              value={pin}
              onChange={setPin}
              required
              autoFocus={open}
              error={error}
              align="center"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={submitting || pin.length !== 6 || loadingImpact}>
              {submitting ? 'Excluindo' : 'Excluir produto'}
            </Button>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-500">
            <Hash className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Use a senha/PIN de administrador apenas quando tiver certeza. A ação é irreversível no cadastro do
              produto.
            </p>
          </div>
        </form>
      </div>
    </Modal>
  )
}
