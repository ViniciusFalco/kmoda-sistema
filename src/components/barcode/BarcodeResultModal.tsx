import type { ReactNode } from 'react'
import { AlertTriangle, Barcode, ChevronRight, PackageSearch, Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { BarcodeLookupResult } from '../../lib/catalog'
import { formatCurrencyBRL } from '../../lib/utils'
import type { Product } from '../../types/database'

export type { BarcodeLookupResult } from '../../lib/catalog'

export interface BarcodeResultAction {
  label: string
  onClick: () => void
  icon?: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'info' | 'light'
}

interface BarcodeResultModalProps {
  open: boolean
  result: BarcodeLookupResult | null
  onClose: () => void
  actions?: BarcodeResultAction[]
  onSelectRelatedProduct?: (product: Product) => void | Promise<void>
}

export function BarcodeResultModal({
  open,
  result,
  onClose,
  actions,
  onSelectRelatedProduct,
}: BarcodeResultModalProps) {
  const resolvedActions = (actions ?? []).filter(
  (action) => action.label.toLowerCase() !== 'fechar',
)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !result || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-gray-900/20 p-4 pt-14 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white text-gray-950 shadow-[0_30px_90px_rgba(15,23,42,0.18)] ring-1 ring-gray-200">
        {result.kind === 'found' ? (
          <FoundContent
            result={result}
            onClose={onClose}
            onSelectRelatedProduct={onSelectRelatedProduct}
          />
        ) : (
          <NotFoundContent code={result.code} onClose={onClose} />
        )}

        {resolvedActions.length > 0 ? (
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
            {resolvedActions.map((action) => (
              <ActionButton key={action.label} action={action} />
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}

function FoundContent({
  result,
  onClose,
  onSelectRelatedProduct,
}: {
  result: Extract<BarcodeLookupResult, { kind: 'found' }>
  onClose: () => void
  onSelectRelatedProduct?: (product: Product) => void | Promise<void>
}) {
  const product = result.product

  const productName = product.product_model?.name ?? product.name
  const reference = product.product_model?.reference || product.reference || '-'
  const category = product.product_model?.category?.name ?? product.clothing_type?.name ?? '-'
  const brand = product.product_model?.brand?.name ?? product.brand?.name ?? '-'
  const hasStock = product.stock_quantity > 0

  return (
    <>
      <header className="relative bg-gray-50 px-6 py-6 text-gray-950">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-5 pr-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
              <Barcode className="h-3.5 w-3.5" />
              Código encontrado
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
              {productName}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Ref. {reference} · {category} · {brand}
            </p>
          </div>

          <div
            className={
              hasStock
                ? 'inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700'
                : 'inline-flex w-fit items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700'
            }
          >
            <span className={hasStock ? 'h-2 w-2 rounded-full bg-emerald-500' : 'h-2 w-2 rounded-full bg-amber-500'} />
            {hasStock ? 'Em estoque' : 'Sem estoque'}
          </div>
        </div>
      </header>

      <main className="space-y-5 px-6 py-6">
        <section className="grid gap-3 text-center sm:grid-cols-2 lg:grid-cols-4">
          <MainInfo label="Cor" value={product.color?.name ?? '-'} />
          <MainInfo label="Tamanho" value={product.size?.name ?? '-'} />
          <MainInfo
            label="Quantidade"
            value={`${product.stock_quantity} unidade${product.stock_quantity === 1 ? '' : 's'}`}
          />
          <MainInfo label="Preço" value={formatCurrencyBRL(product.sale_price)} strong />
        </section>

        <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            Código lido
          </p>

          <p className="mt-2 font-mono text-sm font-bold text-gray-950">
            {result.code}
          </p>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <ResultSection
            icon={<PackageSearch className="h-4 w-4" />}
            title="Mesmo modelo"
            count={result.sameModelVariants.length}
            emptyMessage="Nenhuma variação encontrada para esta referência."
          >
            {result.sameModelVariants.map((product) => (
              <ProductRow
                key={product.id}
                title={`${product.color?.name ?? '-'} · ${product.size?.name ?? '-'}`}
                subtitle={`${product.stock_quantity} unidade${product.stock_quantity === 1 ? '' : 's'}`}
                onClick={onSelectRelatedProduct ? () => void onSelectRelatedProduct(product) : undefined}
              />
            ))}
          </ResultSection>

          <ResultSection
            icon={<Sparkles className="h-4 w-4" />}
            title="Sugestões semelhantes"
            count={result.suggestions.length}
            emptyMessage="Nenhuma sugestão encontrada."
          >
            {result.suggestions.map((product) => (
              <ProductRow
                key={product.id}
                title={product.product_model?.name ?? product.name}
                subtitle={`Ref. ${product.product_model?.reference || product.reference || '-'} · ${product.color?.name ?? '-'} · ${product.size?.name ?? '-'}`}
                badge={`${product.stock_quantity} un.`}
                onClick={onSelectRelatedProduct ? () => void onSelectRelatedProduct(product) : undefined}
              />
            ))}
          </ResultSection>
        </div>
      </main>
    </>
  )
}

function NotFoundContent({ code, onClose }: { code: string; onClose: () => void }) {
  return (
    <>
      <header className="relative bg-gray-50 px-6 py-6 text-gray-950">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5" />
          Código não encontrado
        </div>

        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
          Produto não localizado
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
          Nenhum item cadastrado no estoque com este código.
        </p>
      </header>

      <main className="px-6 py-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
            Código lido
          </p>

          <p className="mt-2 font-mono text-sm font-medium text-gray-950">
            {code}
          </p>
        </div>
      </main>
    </>
  )
}

function MainInfo({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <p className={strong ? 'mt-2 text-lg font-semibold text-gray-950' : 'mt-2 text-base font-medium text-gray-950'}>
        {value}
      </p>
    </div>
  )
}

function ResultSection({
  icon,
  title,
  count,
  emptyMessage,
  children,
}: {
  icon: ReactNode
  title: string
  count: number
  emptyMessage: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-950">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-gray-700 ring-1 ring-gray-200">
            {icon}
          </span>
          {title}
        </div>

        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
          {count}
        </span>
      </div>

      {count === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-4 text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  )
}

function ProductRow({
  title,
  subtitle,
  badge,
  onClick,
}: {
  title: string
  subtitle: string
  badge?: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-950">
          {title}
        </p>

        <p className="mt-1 truncate text-xs text-gray-500">
          {subtitle}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {badge ? (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
              {badge}
            </span>
          ) : null}
        {onClick ? <ChevronRight className="h-4 w-4 text-gray-400" /> : null}
      </div>
    </>
  )

  if (!onClick) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition hover:border-gray-300 hover:bg-gray-50"
    >
      <span className="flex w-full items-center justify-between gap-4">
        {content}
      </span>
    </button>
  )
}

function ActionButton({ action }: { action: BarcodeResultAction }) {
  const variant = action.variant ?? 'secondary'

  const classNameByVariant: Record<NonNullable<BarcodeResultAction['variant']>, string> = {
    primary:
      'border border-gray-200 bg-white text-gray-950 shadow-sm hover:bg-gray-50 focus:ring-gray-100',
    success:
      'border border-emerald-700 bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.22)] hover:bg-emerald-600 focus:ring-emerald-500',
    info:
      'border border-sky-700 bg-sky-500 text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] hover:bg-sky-600 focus:ring-sky-500',
    light:
      'border border-gray-200 bg-white text-gray-950 shadow-sm hover:bg-gray-50 focus:ring-gray-100',
    secondary:
      'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:ring-gray-100',
    ghost:
      'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-100',
    danger:
      'border border-red-400/20 bg-red-500/15 text-red-200 hover:bg-red-500/25 focus:ring-red-300',
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`inline-flex h-12 min-w-[172px] items-center justify-start rounded-2xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${classNameByVariant[variant]}`}
    >
      {action.icon ? (
          <span
            className={
              variant === 'light'
              ? 'mr-3 flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200'
              : 'mr-3 flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-gray-700 ring-1 ring-gray-200'
          }
        >
          {action.icon}
        </span>
      ) : null}
      <span className="truncate">{action.label}</span>
    </button>
  )
}
