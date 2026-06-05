import type { PaymentMethod, Product, SalePricingKind } from '../../types/database'

export type DraftReceiptSourceKind = 'cash_total' | 'installment_group'

export interface DraftSaleLine {
  id: string
  product: Product
  quantity: number
  unitPrice: number
  pricingKind: SalePricingKind
  originalUnitPrice: number
  installmentsCount: number
  installmentValue: number
}

export interface DraftReceiptLine {
  id: string
  sourceKind: DraftReceiptSourceKind
  label: string
  paymentMethod: PaymentMethod
  amount: number
  installmentsCount: number
  installmentValue: number
  locked: boolean
}

export interface SaleTotals {
  cashSubtotal: number
  installmentSubtotal: number
  total: number
}

export interface SaleReceiptSuggestion {
  key: string
  label: string
  amount: number
  installmentsCount: number
}

export function getProductDescription(product: Product) {
  return [
    product.product_model?.reference,
    product.barcode,
    product.product_model?.family,
    product.product_model?.brand?.name ?? product.brand?.name,
    product.product_model?.category?.name ?? product.clothing_type?.name,
    product.size?.name,
    product.color?.name,
  ]
    .filter(Boolean)
    .join(' • ')
}

export function getLineTotal(line: Pick<DraftSaleLine, 'quantity' | 'unitPrice'>) {
  return roundCurrency(line.quantity * line.unitPrice)
}

export function calculateSaleTotals(lines: DraftSaleLine[]): SaleTotals {
  const totals = lines.reduce(
    (accumulator, line) => {
      const lineTotal = getLineTotal(line)
      if (line.pricingKind === 'installment') {
        accumulator.installmentSubtotal += lineTotal
      } else {
        accumulator.cashSubtotal += lineTotal
      }

      accumulator.total += lineTotal
      return accumulator
    },
    { cashSubtotal: 0, installmentSubtotal: 0, total: 0 },
  )

  return {
    cashSubtotal: roundCurrency(totals.cashSubtotal),
    installmentSubtotal: roundCurrency(totals.installmentSubtotal),
    total: roundCurrency(totals.total),
  }
}

export function buildSaleReceiptSuggestions(lines: DraftSaleLine[]): SaleReceiptSuggestion[] {
  const totals = calculateSaleTotals(lines)
  const suggestions: SaleReceiptSuggestion[] = []

  if (totals.cashSubtotal > 0) {
    suggestions.push({
      key: 'cash_total',
      label: 'Receber à vista',
      amount: totals.cashSubtotal,
      installmentsCount: 1,
    })
  }

  const installmentGroups = new Map<number, number>()
  lines.forEach((line) => {
    if (line.pricingKind !== 'installment') {
      return
    }

    const current = installmentGroups.get(line.installmentsCount) ?? 0
    installmentGroups.set(line.installmentsCount, current + getLineTotal(line))
  })

  Array.from(installmentGroups.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([installmentsCount, amount]) => {
      suggestions.push({
        key: `installment_${installmentsCount}`,
        label: `Crédito parcelado ${installmentsCount}x`,
        amount: roundCurrency(amount),
        installmentsCount,
      })
    })

  return suggestions
}

export function buildInitialReceiptLines(lines: DraftSaleLine[]): DraftReceiptLine[] {
  const totals = calculateSaleTotals(lines)
  const suggestions = buildSaleReceiptSuggestions(lines)
  const receiptLines: DraftReceiptLine[] = []

  if (totals.cashSubtotal > 0) {
    receiptLines.push({
      id: 'receipt-cash-1',
      sourceKind: 'cash_total',
      label: 'Recebimento à vista',
      paymentMethod: 'dinheiro',
      amount: totals.cashSubtotal,
      installmentsCount: 1,
      installmentValue: totals.cashSubtotal,
      locked: false,
    })
  }

  suggestions
    .filter((suggestion) => suggestion.key !== 'cash_total')
    .forEach((suggestion) => {
      receiptLines.push({
        id: `receipt-${suggestion.key}`,
        sourceKind: 'installment_group',
        label: suggestion.label,
        paymentMethod: 'cartao_credito',
        amount: suggestion.amount,
        installmentsCount: suggestion.installmentsCount,
        installmentValue: suggestion.amount / Math.max(1, suggestion.installmentsCount),
        locked: true,
      })
    })

  return receiptLines
}

export function createBlankReceiptLine(index: number): DraftReceiptLine {
  const uniqueSuffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  return {
    id: `receipt-manual-${index + 1}-${uniqueSuffix}`,
    sourceKind: 'cash_total',
    label: 'Recebimento adicional',
    paymentMethod: 'dinheiro',
    amount: 0,
    installmentsCount: 1,
    installmentValue: 0,
    locked: false,
  }
}

export function formatDraftLineLabel(line: DraftSaleLine) {
  const base = line.product.product_model?.name ?? line.product.name
  const suffix = getProductDescription(line.product)

  return suffix ? { base, suffix } : { base, suffix: '-' }
}

function roundCurrency(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}
