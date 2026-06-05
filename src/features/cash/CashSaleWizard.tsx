import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Plus, Search, Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Table } from '../../components/ui/Table'
import { CashSessionBlockedOverlay } from './CashSessionBlockedOverlay'
import { CashCustomerQuickCreateModal } from './CashCustomerQuickCreateModal'
import { CashSaleCompletionModal } from './CashSaleCompletionModal'
import { CashItemInstallmentModal } from './CashItemInstallmentModal'
import { createCashIncome, findProductByBarcode, friendlyCatalogError, listProducts, registerSaleWithCashAndStock, searchCustomers } from '../../lib/catalog'
import { isValidBarcode, normalizeBarcode } from '../../lib/barcode'
import {
  formatCPF,
  formatCurrencyBRL,
  formatCurrencyInput,
  formatPhoneBR,
  getTodayLocalDate,
  parseCurrencyToNumber,
} from '../../lib/utils'
import type { Customer, PaymentMethod, Product } from '../../types/database'
import { useAuth } from '../../hooks/useAuth'
import {
  buildInitialReceiptLines,
  calculateSaleTotals,
  createBlankReceiptLine,
  getLineTotal,
  getProductDescription,
  type DraftReceiptLine,
  type DraftSaleLine,
} from './saleFlow'

type EntryMode = 'product_sale' | 'manual_income' | null
type ProductStep = 1 | 2 | 3 | 4 | 5

interface CashSaleFormProps {
  onCancel: () => void
  onSaved: () => void
  onOpenCash: () => void
  onHeaderCenterChange?: (value: ReactNode | null) => void
  cashSessionId?: string | null
  sessionClosed?: boolean
  initialBarcode?: string
}

const productStepLabels = ['Tipo', 'Cliente', 'Produtos', 'Resumo', 'Recebimento']

const receiptPaymentOptions = [
  { value: 'dinheiro' as const, label: 'Dinheiro' },
  { value: 'pix' as const, label: 'Pix' },
  { value: 'cartao_debito' as const, label: 'Débito' },
  { value: 'cartao_credito' as const, label: 'Crédito à vista' },
]

const manualPaymentOptions = [
  { value: 'dinheiro' as const, label: 'Dinheiro' },
  { value: 'pix' as const, label: 'Pix' },
  { value: 'cartao_debito' as const, label: 'Cartão de débito' },
  { value: 'cartao_credito' as const, label: 'Cartão de crédito' },
  { value: 'outro' as const, label: 'Outro' },
]

export function CashSaleForm({
  onCancel,
  onSaved,
  onOpenCash,
  onHeaderCenterChange,
  cashSessionId,
  sessionClosed,
  initialBarcode = '',
}: CashSaleFormProps) {
  const { user } = useAuth()
  const [mode, setMode] = useState<EntryMode>(null)
  const [productStep, setProductStep] = useState<ProductStep>(1)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [customerResults, setCustomerResults] = useState<Customer[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [customerDraftName, setCustomerDraftName] = useState('')
  const [items, setItems] = useState<DraftSaleLine[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [productResults, setProductResults] = useState<Product[]>([])
  const [productSearching, setProductSearching] = useState(false)
  const [installmentLine, setInstallmentLine] = useState<DraftSaleLine | null>(null)
  const [receiptLines, setReceiptLines] = useState<DraftReceiptLine[]>([])
  const [confirmedReceiptIds, setConfirmedReceiptIds] = useState<string[]>([])
  const [cashTenderedAmounts, setCashTenderedAmounts] = useState<Record<string, number>>({})
  const [saleCompletionData, setSaleCompletionData] = useState<{ customerName: string; total: number } | null>(null)
  const [saleCompletionOpen, setSaleCompletionOpen] = useState(false)
  const [manualDescription, setManualDescription] = useState('')
  const [manualAmount, setManualAmount] = useState('')
  const [manualPaymentMethod, setManualPaymentMethod] = useState<PaymentMethod>('dinheiro')
  const [movementDate, setMovementDate] = useState(getTodayLocalDate())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const initialBarcodeRef = useRef(initialBarcode.trim())
  const cashSessionOpen = Boolean(cashSessionId) && !sessionClosed
  const isBlocked = !cashSessionOpen
  const blockedMessage = 'Abra o caixa para registrar vendas ou despesas.'
  const saleCompletionCloseDelayMs = 320
  const saleCompletionCloseTimerRef = useRef<number | null>(null)

  const productTotals = useMemo(() => calculateSaleTotals(items), [items])
  const receiptSummary = useMemo(() => {
    const confirmedLines = receiptLines.filter((line) => confirmedReceiptIds.includes(line.id))
    const confirmed = roundCurrency(confirmedLines.reduce((sum, line) => sum + line.amount, 0))
    const change = roundCurrency(
      receiptLines.reduce((sum, line) => {
        if (line.paymentMethod !== 'dinheiro' || line.sourceKind !== 'cash_total') {
          return sum
        }

        const tenderedAmount = roundCurrency(cashTenderedAmounts[line.id] ?? line.amount)
        return sum + Math.max(0, tenderedAmount - line.amount)
      }, 0),
    )
    const missing = roundCurrency(Math.max(0, productTotals.total - confirmed))
    const balanced = missing === 0 && receiptLines.length > 0 && receiptLines.every((line) => confirmedReceiptIds.includes(line.id))

    return {
      total: productTotals.total,
      change,
      balanced,
    }
  }, [cashTenderedAmounts, confirmedReceiptIds, productTotals.total, receiptLines])
  const selectedQuantityByProductId = useMemo(() => {
    return items.reduce<Record<string, number>>((accumulator, line) => {
      accumulator[line.product.id] = (accumulator[line.product.id] ?? 0) + line.quantity
      return accumulator
    }, {})
  }, [items])
  const visibleProductResults = useMemo(() => {
    return productResults
      .map((product) => {
        const reservedQuantity = selectedQuantityByProductId[product.id] ?? 0
        return {
          product,
          availableStock: Math.max(0, product.stock_quantity - reservedQuantity),
        }
      })
      .filter((entry) => entry.availableStock > 0)
  }, [productResults, selectedQuantityByProductId])
  const hasCustomerResults = customerResults.length > 0
  const hasProductResults = visibleProductResults.length > 0
  const saleHeaderCenterNode = useMemo(() => {
    if (mode !== 'product_sale') {
      return null
    }

    return (
      <div className="flex flex-wrap justify-center gap-2">
        {productStepLabels.map((label, index) => {
          const stepNumber = index + 1
          const active = stepNumber === productStep
          const completed = stepNumber < productStep

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  completed
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : active
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {label}
              </div>
              {index < productStepLabels.length - 1 ? <span className="font-bold text-gray-400">&gt;</span> : null}
            </div>
          )
        })}
      </div>
    )
  }, [mode, productStep])

  useEffect(() => {
    if (mode !== 'product_sale' || productStep !== 2) {
      return
    }

    const term = customerQuery.trim()
    if (term.length < 2) {
      return
    }

    let active = true

    const timeout = window.setTimeout(() => {
      setCustomerSearching(true)
      searchCustomers(term)
        .then((customers) => {
          if (active) {
            setCustomerResults(customers.slice(0, 8))
          }
        })
        .catch((err) => {
          if (active) {
            setError(friendlyCatalogError(err))
          }
        })
        .finally(() => {
          if (active) {
            setCustomerSearching(false)
          }
        })
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [customerQuery, mode, productStep])

  useEffect(() => {
    if (mode !== 'product_sale' || productStep !== 3) {
      return
    }

    const term = productQuery.trim()
    if (term.length < 2) {
      return
    }

    let active = true

    const timeout = window.setTimeout(() => {
      setProductSearching(true)
      listProducts({ query: term, active: true })
        .then((products) => {
          if (active) {
            setProductResults(products.slice(0, 8))
          }
        })
        .catch((err) => {
          if (active) {
            setError(friendlyCatalogError(err))
          }
        })
        .finally(() => {
          if (active) {
            setProductSearching(false)
          }
        })
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [mode, productQuery, productStep])

  useEffect(() => {
    if (mode !== 'product_sale') {
      return
    }

    setReceiptLines(buildInitialReceiptLines(items))
    setConfirmedReceiptIds([])
    setCashTenderedAmounts({})
  }, [items, mode])

  useEffect(() => {
    if (!onHeaderCenterChange) {
      return
    }

    onHeaderCenterChange(saleHeaderCenterNode)
  }, [onHeaderCenterChange, saleHeaderCenterNode])

  useEffect(() => {
    setCashTenderedAmounts((current) => {
      const next = { ...current }

      receiptLines.forEach((line) => {
        if (next[line.id] === undefined) {
          next[line.id] = line.amount
        }
      })

      Object.keys(next).forEach((lineId) => {
        if (!receiptLines.some((line) => line.id === lineId)) {
          delete next[lineId]
        }
      })

      return next
    })

    setConfirmedReceiptIds((current) => current.filter((lineId) => receiptLines.some((line) => line.id === lineId)))
  }, [receiptLines])

  useEffect(() => {
    return () => {
      if (saleCompletionCloseTimerRef.current !== null) {
        window.clearTimeout(saleCompletionCloseTimerRef.current)
        saleCompletionCloseTimerRef.current = null
      }
    }
  }, [])

  const handleBarcodeScan = useCallback(
    async (rawCode: string) => {
      if (mode !== 'product_sale' || productStep !== 3) {
        return
      }

      const code = normalizeBarcode(rawCode)

      if (!isValidBarcode(code)) {
        setError('Informe um código de barras válido.')
        return
      }

      setProductSearching(true)
      setError('')

      try {
        const product = await findProductByBarcode(code)

        if (!product) {
          setError('Produto não encontrado para este código.')
          return
        }

        addProduct(product)
      } catch (err) {
        setError(friendlyCatalogError(err))
      } finally {
        setProductSearching(false)
      }
    },
    [addProduct, mode, productStep],
  )

  useEffect(() => {
    if (mode !== 'product_sale' || productStep !== 3) {
      return
    }

    const code = initialBarcodeRef.current
    if (!code) {
      return
    }

    initialBarcodeRef.current = ''
    void handleBarcodeScan(code)
  }, [mode, productStep, handleBarcodeScan])

  function resetSaleFlow() {
    setSelectedCustomer(null)
    setCustomerQuery('')
    setCustomerResults([])
    setCustomerSearching(false)
    setCustomerModalOpen(false)
    setItems([])
    setProductQuery('')
    setProductResults([])
    setProductSearching(false)
    setInstallmentLine(null)
    setReceiptLines([])
    setManualDescription('')
    setManualAmount('')
    setManualPaymentMethod('dinheiro')
    setMovementDate(getTodayLocalDate())
    setNotes('')
    setSubmitting(false)
    setError('')
    setSaleCompletionData(null)
    setSaleCompletionOpen(false)
    setProductStep(1)
    initialBarcodeRef.current = initialBarcode.trim()
  }

  function chooseMode(nextMode: Exclude<EntryMode, null>) {
    resetSaleFlow()
    setMode(nextMode)

    if (nextMode === 'product_sale') {
      setProductStep(2)
    }
  }

  function backFromProductStep() {
    setError('')

    if (productStep === 2) {
      resetSaleFlow()
      setMode(null)
      return
    }

    setProductStep((current) => Math.max(2, current - 1) as ProductStep)
  }

  function nextProductStep() {
    setError('')
    setProductStep((current) => Math.min(5, current + 1) as ProductStep)
  }

  function handleCustomerSelect(customer: Customer) {
    setSelectedCustomer(customer)
    setCustomerQuery('')
    setCustomerResults([])
    setError('')
    setCustomerDraftName('')
  }

  function handleCustomerCreated(customer: Customer) {
    handleCustomerSelect(customer)
    setCustomerModalOpen(false)
  }

  function openCustomerModal() {
    setCustomerDraftName(customerQuery.trim())
    setCustomerModalOpen(true)
  }

  function addProduct(product: Product) {
    setError('')

    if (product.stock_quantity <= 0) {
      setError(`Produto sem estoque: ${product.name}.`)
      return
    }

    setItems((current) => {
      const existing = current.find((line) => line.product.id === product.id)
      const reservedQuantity = current.reduce((sum, line) => {
        if (line.product.id !== product.id) {
          return sum
        }

        return sum + line.quantity
      }, 0)
      const availableStock = Math.max(0, product.stock_quantity - (existing ? reservedQuantity - existing.quantity : reservedQuantity))

      if (existing) {
        const nextQuantity = existing.quantity + 1
        if (nextQuantity > availableStock) {
          setError(`Estoque insuficiente para ${product.name}.`)
          return current
        }

        return current.map((line) => {
          if (line.id !== existing.id) {
            return line
          }

          const nextLine = {
            ...line,
            quantity: nextQuantity,
          }

          return {
            ...nextLine,
            installmentValue:
              nextLine.pricingKind === 'installment'
                ? getLineTotal(nextLine) / Math.max(1, nextLine.installmentsCount)
                : getLineTotal(nextLine),
          }
        })
      }

      return [
        ...current,
        {
          id: product.id,
          product,
          quantity: 1,
          unitPrice: product.sale_price,
          pricingKind: 'cash',
          originalUnitPrice: product.sale_price,
          installmentsCount: 1,
          installmentValue: product.sale_price,
        },
      ]
    })

    setProductQuery('')
    setProductResults([])
  }

  function updateItemQuantity(id: string, quantity: number) {
    setItems((current) =>
      current.map((line) => {
        if (line.id !== id) {
          return line
        }

        const reservedOtherQuantity = current.reduce((sum, item) => {
          if (item.product.id !== line.product.id || item.id === line.id) {
            return sum
          }

          return sum + item.quantity
        }, 0)
        const availableStock = Math.max(1, line.product.stock_quantity - reservedOtherQuantity)
        const nextQuantity = Math.max(1, Math.min(quantity || 1, availableStock))
        const nextLine = { ...line, quantity: nextQuantity }

        return {
          ...nextLine,
          installmentValue:
            nextLine.pricingKind === 'installment'
              ? getLineTotal(nextLine) / Math.max(1, nextLine.installmentsCount)
              : getLineTotal(nextLine),
        }
      }),
    )
  }

  function updateItemUnitPrice(id: string, value: string) {
    const unitPrice = parseCurrencyToNumber(value)

    setItems((current) =>
      current.map((line) => {
        if (line.id !== id) {
          return line
        }

        const nextLine = {
          ...line,
          unitPrice,
        }

        return {
          ...nextLine,
          installmentValue:
            nextLine.pricingKind === 'installment'
              ? getLineTotal(nextLine) / Math.max(1, nextLine.installmentsCount)
              : getLineTotal(nextLine),
        }
      }),
    )
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((line) => line.id !== id))
  }

  function openInstallmentModal(line: DraftSaleLine) {
    setInstallmentLine(line)
  }

  function applyInstallmentConfig(values: {
    unitPrice: number
    originalUnitPrice: number
    installmentsCount: number
    installmentValue: number
  }) {
    if (!installmentLine) {
      return
    }

    setItems((current) =>
      current.map((line) => {
        if (line.id !== installmentLine.id) {
          return line
        }

        return {
          ...line,
          pricingKind: 'installment',
          unitPrice: values.unitPrice,
          originalUnitPrice: values.originalUnitPrice,
          installmentsCount: values.installmentsCount,
          installmentValue: values.installmentValue,
        }
      }),
    )

    setInstallmentLine(null)
  }

  function setLinePricingKind(id: string, pricingKind: 'cash' | 'installment') {
    setError('')

    const line = items.find((item) => item.id === id)
    if (!line) {
      return
    }

    if (pricingKind === 'cash') {
      setItems((current) =>
        current.map((item) => {
          if (item.id !== id) {
            return item
          }

          const nextLine = {
            ...item,
            pricingKind: 'cash' as const,
            installmentsCount: 1,
            installmentValue: getLineTotal(item),
          }

          return nextLine
        }),
      )
      return
    }

    openInstallmentModal(line)
  }

  function updateReceiptLine(id: string, patch: Partial<DraftReceiptLine>) {
    setError('')

    const currentLine = receiptLines.find((line) => line.id === id)
    if (!currentLine) {
      return
    }

    if (currentLine.sourceKind === 'installment_group' && patch.paymentMethod && patch.paymentMethod !== 'cartao_credito') {
      setError('Este item foi configurado como parcelado. Para receber por Pix, dinheiro ou débito, altere a condição do produto para À vista.')
      return
    }

    setReceiptLines((current) =>
      current.map((line) => {
        if (line.id !== id) {
          return line
        }

        const nextLine = {
          ...line,
          ...patch,
        }

        if (nextLine.sourceKind === 'cash_total' && nextLine.paymentMethod !== 'cartao_credito') {
          nextLine.installmentsCount = 1
          nextLine.installmentValue = nextLine.amount
        }

        if (nextLine.paymentMethod === 'cartao_credito' && nextLine.sourceKind === 'cash_total') {
          nextLine.installmentsCount = 1
          nextLine.installmentValue = nextLine.amount
        }

        if (nextLine.sourceKind === 'installment_group') {
          nextLine.paymentMethod = 'cartao_credito'
          nextLine.installmentValue = nextLine.amount / Math.max(1, nextLine.installmentsCount)
        }

        return nextLine
      }),
    )

    setCashTenderedAmounts((current) => {
      const next = { ...current }
      const nextAmount = patch.amount ?? currentLine.amount

      if (currentLine.sourceKind === 'cash_total' || currentLine.sourceKind === 'installment_group') {
        if ((patch.paymentMethod ?? currentLine.paymentMethod) === 'dinheiro' && currentLine.sourceKind === 'cash_total') {
          next[id] = Math.max(next[id] ?? nextAmount, nextAmount)
        }

        if (currentLine.sourceKind === 'installment_group') {
          delete next[id]
        }
      }

      return next
    })
  }

  function addReceiptLine() {
    setReceiptLines((current) => [...current, createBlankReceiptLine(current.length)])
  }

  function toggleReceiptConfirmation(id: string) {
    setConfirmedReceiptIds((current) =>
      current.includes(id) ? current.filter((lineId) => lineId !== id) : [...current, id],
    )
  }

  function finalizeSaleAfterCompletion() {
    if (saleCompletionCloseTimerRef.current !== null) {
      window.clearTimeout(saleCompletionCloseTimerRef.current)
      saleCompletionCloseTimerRef.current = null
    }

    saleCompletionCloseTimerRef.current = window.setTimeout(() => {
      saleCompletionCloseTimerRef.current = null
      setSaleCompletionData(null)
      setSaleCompletionOpen(false)
      void onSaved()
    }, saleCompletionCloseDelayMs)
  }

  function requestSaleCompletionClose() {
    if (!saleCompletionOpen || saleCompletionCloseTimerRef.current !== null) {
      return
    }

    setSaleCompletionOpen(false)
    finalizeSaleAfterCompletion()
  }

  function updateCashTenderedAmount(id: string, value: string) {
    setError('')
    setCashTenderedAmounts((current) => ({
      ...current,
      [id]: parseCurrencyToNumber(formatCurrencyInput(value)),
    }))
  }

  async function handleSubmit() {
    if (mode === 'manual_income') {
      await submitManualIncome()
      return
    }

    await submitProductSale()
  }

  async function submitProductSale() {
    if (!cashSessionOpen) {
      setError(blockedMessage)
      return
    }

    if (items.length === 0) {
      setError('Adicione pelo menos um produto.')
      return
    }

    const invalidItem = items.find((item) => item.quantity > item.product.stock_quantity)
    if (invalidItem) {
      setError(`Estoque insuficiente para ${invalidItem.product.name}.`)
      return
    }

    const total = productTotals.total
    const allocated = roundCurrency(receiptLines.reduce((sum, line) => sum + line.amount, 0))
    if (Math.abs(total - allocated) > 0.01) {
      setError('A soma dos recebimentos precisa fechar exatamente com o total da venda.')
      return
    }

    if (receiptLines.some((line) => line.amount <= 0)) {
      setError('Informe valores válidos para todos os recebimentos.')
      return
    }

    if (receiptLines.some((line) => !confirmedReceiptIds.includes(line.id))) {
      setError('Confirme todos os pagamentos antes de finalizar a venda.')
      return
    }

    if (
      receiptLines.some(
        (line) =>
          line.paymentMethod === 'dinheiro' &&
          line.sourceKind === 'cash_total' &&
          roundCurrency(cashTenderedAmounts[line.id] ?? line.amount) < line.amount,
      )
    ) {
      setError('Informe o valor entregue pelo cliente para o pagamento em dinheiro.')
      return
    }

    if (receiptLines.some((line) => line.sourceKind === 'installment_group' && line.paymentMethod !== 'cartao_credito')) {
      setError('Os itens parcelados precisam ser recebidos no crédito parcelado.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await registerSaleWithCashAndStock({
        customerId: selectedCustomer?.id ?? null,
        items: items.map((item) => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          pricingKind: item.pricingKind,
          originalUnitPrice: item.originalUnitPrice,
          installmentsCount: item.installmentsCount,
          installmentValue: item.installmentValue,
        })),
        payments: receiptLines.map((line) => ({
          sourceKind: line.sourceKind,
          paymentMethod: line.paymentMethod,
          amount: line.amount,
          installmentsCount: line.installmentsCount,
          installmentValue: line.installmentValue,
        })),
        movementDate,
        notes,
        user,
        cashSessionId,
      })

      setSaleCompletionData({
        customerName: selectedCustomer?.name ?? 'Cliente avulso',
        total: productTotals.total,
      })
      setSaleCompletionOpen(true)
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function submitManualIncome() {
    if (!cashSessionOpen) {
      setError(blockedMessage)
      return
    }

    const amount = parseCurrencyToNumber(manualAmount)

    if (!manualDescription.trim()) {
      setError('Informe a descrição da entrada.')
      return
    }

    if (amount <= 0) {
      setError('Informe um valor maior que zero.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await createCashIncome({
        description: manualDescription,
        amount,
        movementDate,
        paymentMethod: manualPaymentMethod,
        notes,
        user,
        cashSessionId,
      })
      onSaved()
    } catch (err) {
      setError(friendlyCatalogError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const renderTypeChooser = () => (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Etapa 1</p>
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-gray-950">Escolha o tipo de lançamento</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          className="rounded-md border-2 border-gray-300 bg-white p-5 text-left transition hover:border-gray-900 hover:bg-gray-50"
          onClick={() => chooseMode('product_sale')}
        >
          <span className="block text-base font-semibold text-gray-950">Venda com produto</span>
        </button>
        <button
          type="button"
          className="rounded-md border-2 border-gray-300 bg-white p-5 text-left transition hover:border-gray-900 hover:bg-gray-50"
          onClick={() => chooseMode('manual_income')}
        >
          <span className="block text-base font-semibold text-gray-950">Entrada avulsa</span>
        </button>
      </div>
    </div>
  )

  const renderCustomerStep = () => (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Etapa 2</p>
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-gray-950">Cliente</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <Input
              className="h-12 pl-10 text-base"
              placeholder="Buscar cliente por nome, CPF ou telefone"
              value={customerQuery}
              onChange={(event) => {
                setCustomerQuery(event.target.value)
                setError('')
              }}
            />
          </div>

          {customerQuery.trim().length >= 2 ? (
            <div className="rounded-md border-2 border-gray-200 bg-white">
              {customerSearching ? (
                <div className="px-4 py-5 text-sm text-gray-500">Buscando clientes...</div>
              ) : hasCustomerResults ? (
                <div className="max-h-64 overflow-y-auto p-1">
                  {customerResults.map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        className={`flex w-full items-start justify-between gap-4 rounded-md px-3 py-3 text-left transition ${
                          isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-gray-950">{customer.name}</span>
                          <span className="block text-xs text-gray-500">
                            {[
                              formatPhoneBR(customer.phone),
                              formatCPF(customer.cpf),
                            ]
                              .filter((value) => value && value !== '-')
                              .join(' • ') || 'Sem telefone ou CPF'}
                          </span>
                        </span>
                        {isSelected ? <Badge variant="success">Selecionado</Badge> : null}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-3 px-4 py-5">
                  <div className="text-sm text-gray-600">Cliente não encontrado.</div>
                  <Button type="button" variant="secondary" onClick={openCustomerModal}>
                    <UserPlus className="h-4 w-4" />
                    Criar novo cliente
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="rounded-md border-2 border-gray-200 bg-gray-50 p-4">
          {selectedCustomer ? (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Cliente selecionado</p>
              <p className="text-lg font-semibold text-gray-950">{selectedCustomer.name}</p>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{formatPhoneBR(selectedCustomer.phone)}</p>
                <p>{formatCPF(selectedCustomer.cpf)}</p>
              </div>
              <Button variant="secondary" onClick={() => setSelectedCustomer(null)}>
                Limpar cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Cliente opcional</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderProductsStep = () => (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Etapa 3</p>
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-gray-950">Produtos</h2>
      </div>

      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          <Input
            className="h-12 pl-10 text-base"
            placeholder="Buscar por produto, código de barras, marca, tipo, tamanho ou cor"
            value={productQuery}
            onChange={(event) => {
              setProductQuery(event.target.value)
              setError('')
              if (event.target.value.trim().length < 2) {
                setProductResults([])
                setProductSearching(false)
              }
            }}
          />
        </div>
        <BarcodeScanButton label="Ler código" variant="secondary" onScan={handleBarcodeScan} className="h-12" />
      </div>

      {productQuery.trim().length >= 2 ? (
        <div className="rounded-md border-2 border-gray-200 bg-white">
          {productSearching ? (
            <div className="px-4 py-5 text-sm text-gray-500">Buscando produtos...</div>
          ) : hasProductResults ? (
            <div className="max-h-56 overflow-y-auto p-1">
              {visibleProductResults.map((entry) => (
                <button
                  key={entry.product.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-3 text-left transition hover:bg-gray-50"
                  onClick={() => addProduct(entry.product)}
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-950">{entry.product.product_model?.name ?? entry.product.name}</span>
                    <span className="block text-xs text-gray-500">{getProductDescription(entry.product) || 'Sem detalhes'}</span>
                  </span>
                  <Badge variant="neutral">Estoque {entry.availableStock}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-5 text-sm text-gray-500">Nenhum produto encontrado.</div>
          )}
        </div>
      ) : null}

      <div className="rounded-md border-2 border-gray-200 bg-white">
        <div className="border-b-2 border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-950">Itens da venda</p>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <Table
            data={items}
            emptyMessage="Nenhum produto adicionado."
            columns={[
              {
                key: 'product',
                header: 'Produto',
                render: (item) => (
                  <div className="min-w-0">
                    <p className="font-medium text-gray-950">{item.product.product_model?.name ?? item.product.name}</p>
                    <p className="text-xs text-gray-500">{getProductDescription(item.product) || '-'}</p>
                  </div>
                ),
              },
              {
                key: 'quantity',
                header: 'Qtd.',
                render: (item) => (
                  <Input
                    className="w-20"
                    type="number"
                    min="1"
                    max={item.product.stock_quantity}
                    value={item.quantity}
                    onChange={(event) => updateItemQuantity(item.id, Number(event.target.value))}
                  />
                ),
              },
              {
                key: 'value',
                header: 'Valor',
                render: (item) => (
                  <Input
                    className="w-32"
                    type="text"
                    inputMode="decimal"
                    value={formatCurrencyBRL(item.unitPrice)}
                    onChange={(event) => updateItemUnitPrice(item.id, formatCurrencyInput(event.target.value))}
                  />
                ),
              },
              {
                key: 'condition',
                header: 'Condição',
                render: (item) => (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={item.pricingKind === 'cash' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setLinePricingKind(item.id, 'cash')}
                      className="w-full"
                    >
                      À vista
                    </Button>
                    <Button
                      variant={item.pricingKind === 'installment' ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setLinePricingKind(item.id, 'installment')}
                      className="w-full"
                    >
                      {item.pricingKind === 'installment' ? `${item.installmentsCount}x` : 'Parcelado'}
                    </Button>
                  </div>
                ),
              },
              {
                key: 'total',
                header: 'Total',
                render: (item) => formatCurrencyBRL(getLineTotal(item)),
              },
              {
                key: 'action',
                header: 'Ação',
                render: (item) => (
                  <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)} aria-label="Remover item">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  )

  const renderSummaryStep = () => (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Etapa 4</p>
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-gray-950">Resumo da venda</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Total a vista" value={formatCurrencyBRL(productTotals.cashSubtotal)} labelClassName="text-gray-950" />
        <SummaryCard label="Total Parcelado" value={formatCurrencyBRL(productTotals.installmentSubtotal)} labelClassName="text-gray-950" />
        <SummaryCard label="Total da venda" value={formatCurrencyBRL(productTotals.total)} emphasis />
      </div>
    </div>
  )

  const renderReceiptStep = () => {
    return (
      <div className="flex min-h-0 flex-col gap-3">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Etapa 5</p>
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-gray-950">Recebimento</h2>
        </div>

        <div className="rounded-md border-2 border-gray-200 bg-gray-50 text-center p-2 shadow-sm">
          <div className="rounded-md border-2 border-gray-300 bg-black px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Total da venda</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-white">{formatCurrencyBRL(receiptSummary.total)}</p>
          </div>
        </div>

        <div className="rounded-md border-2 border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-100 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-700">Formas de pagamento</p>
            </div>
            {productTotals.cashSubtotal > 0 ? (
              <Button variant="secondary" size="sm" onClick={addReceiptLine}>
                <Plus className="h-4 w-4" />
                Adicionar forma
              </Button>
            ) : null}
          </div>

          <div className="hidden grid-cols-[minmax(0,1.05fr)_120px_minmax(0,1.8fr)_88px_96px] gap-2 border-b-2 border-gray-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500 lg:grid">
            <span>Pagamento</span>
            <span>Valor</span>
            <span>Detalhes</span>
            <span>Status</span>
            <span className="text-right">Ação</span>
          </div>

          <div className="max-h-[15rem] overflow-y-auto kmoda-scrollbar">
            <div className="space-y-2 p-2.5">
              {receiptLines.map((line) => {
                const isConfirmed = confirmedReceiptIds.includes(line.id)
                const tenderedAmount = roundCurrency(cashTenderedAmounts[line.id] ?? line.amount)
                const changeAmount =
                  line.paymentMethod === 'dinheiro' && line.sourceKind === 'cash_total'
                    ? roundCurrency(Math.max(0, tenderedAmount - line.amount))
                    : 0
                const isCashLine = line.paymentMethod === 'dinheiro' && line.sourceKind === 'cash_total'
                const paymentMethodLabel =
                  line.sourceKind === 'installment_group'
                    ? 'Crédito parcelado'
                    : receiptPaymentOptions.find((option) => option.value === line.paymentMethod)?.label ?? 'Forma'
                const isConfirmedCard = isConfirmed
                const statusBadgeClassName = isConfirmedCard
                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                  : 'border-amber-200 bg-amber-50 text-amber-700'

                return (
                  <div
                    key={line.id}
                    className={`rounded-md border-2 p-2.5 transition ${
                      isConfirmedCard ? 'border-emerald-500 bg-emerald-100' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="grid gap-2 lg:grid-cols-[minmax(0,1.05fr)_120px_minmax(0,1.8fr)_88px_96px] lg:items-start">
                      <div className="min-w-0 pt-0.5">
                        <p className="h-5 truncate text-sm font-semibold leading-tight text-gray-950">{line.label}</p>
                        <div className="mt-1">
                          {line.sourceKind === 'installment_group' ? (
                            <div className="flex h-10 items-center rounded-md border-2 border-gray-200 bg-gray-50 px-2.5 text-xs font-medium text-gray-900">
                              {paymentMethodLabel}
                            </div>
                          ) : (
                            <select
                              className="h-10 w-full rounded-md border-2 border-gray-300 bg-white px-2.5 text-xs text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                              value={line.paymentMethod}
                              onChange={(event) => updateReceiptLine(line.id, { paymentMethod: event.target.value as PaymentMethod })}
                            >
                              {receiptPaymentOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 lg:pt-6">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600 lg:hidden">Valor</span>
                        <Input
                          inputMode="numeric"
                          className="h-10 px-2.5 text-xs"
                          value={formatCurrencyBRL(line.amount)}
                          disabled={line.sourceKind === 'installment_group'}
                          onChange={(event) => updateReceiptLine(line.id, { amount: parseCurrencyToNumber(formatCurrencyInput(event.target.value)) })}
                        />
                      </div>

                      <div className="min-w-0 lg:pt-6">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600 lg:hidden">Detalhes</span>
                        <div className="min-h-10 rounded-md border-2 border-gray-200 bg-gray-50 px-2.5 py-2 text-xs text-gray-700">
                          {line.sourceKind === 'installment_group' ? (
                            <span className="font-medium text-gray-900">
                              {line.installmentsCount}x de {formatCurrencyBRL(roundCurrency(line.installmentValue))}
                            </span>
                          ) : isCashLine ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                              <label className="inline-flex items-center gap-2">
                                <span className="whitespace-nowrap font-semibold uppercase tracking-[0.12em] text-gray-600">Cliente entregou</span>
                                <Input
                                  inputMode="numeric"
                                  className="h-8 w-32 px-2.5 text-xs"
                                  value={formatCurrencyBRL(tenderedAmount)}
                                  onChange={(event) => updateCashTenderedAmount(line.id, event.target.value)}
                                />
                              </label>
                              <span className="inline-flex items-center gap-2">
                                <span className="whitespace-nowrap font-semibold uppercase tracking-[0.12em] text-gray-600">Troco</span>
                                <Input
                                  disabled
                                  className="h-8 w-28 px-2.5 text-xs"
                                  value={formatCurrencyBRL(changeAmount)}
                                  readOnly
                                />
                              </span>
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900">Pagamento único</span>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 lg:pt-6">
                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.12em] text-gray-600 lg:hidden">Status</span>
                        <div className="flex h-10 items-center">
                          <Badge variant={isConfirmed ? 'success' : 'warning'} className={`w-fit ${statusBadgeClassName}`}>
                            {isConfirmed ? 'Conferido' : 'Pendente'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex min-w-0 items-center justify-start lg:pt-6 lg:justify-end">
                        <button
                          type="button"
                          className={`inline-flex h-10 items-center gap-2 rounded-md border-2 px-3 text-xs font-semibold transition ${
                            isConfirmed
                              ? 'border-emerald-700 bg-emerald-700 text-white hover:border-emerald-800 hover:bg-emerald-800'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-900 hover:text-gray-900'
                          }`}
                          onClick={() => toggleReceiptConfirmation(line.id)}
                          aria-label={isConfirmed ? 'Desfazer conferência' : 'Conferir pagamento'}
                        >
                          {isConfirmed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          {isConfirmed ? 'Desfazer' : 'Conferir'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="rounded-md border-2 border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Data</p>
              </div>
            </div>
            <div className="mt-2">
              <Input type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} />
            </div>
          </div>

          <div className="rounded-md border-2 border-gray-200 bg-white p-3 shadow-sm">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Observação</p>
            </div>
            <textarea
              className="mt-2 min-h-16 w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
              placeholder="Digite uma observação opcional."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
      </div>
    )
  }
  const renderManualForm = () => (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Entrada avulsa</p>
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-gray-950">Lançamento rápido</h2>
        <p className="text-sm text-gray-600">Use para registrar um recebimento sem produtos.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Input label="Descrição" value={manualDescription} onChange={(event) => setManualDescription(event.target.value)} />
        <Input
          label="Valor"
          inputMode="decimal"
          placeholder="R$ 0,00"
          value={manualAmount}
          onChange={(event) => setManualAmount(formatCurrencyInput(event.target.value))}
        />
        <label className="block space-y-1.5">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">Forma de pagamento</span>
          <select
            className="h-10 w-full rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
            value={manualPaymentMethod}
            onChange={(event) => setManualPaymentMethod(event.target.value as PaymentMethod)}
          >
            {manualPaymentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Input label="Data" type="date" value={movementDate} onChange={(event) => setMovementDate(event.target.value)} />
      </div>

      <label className="block space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">Observação</span>
        <textarea
          className="min-h-24 w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
    </div>
  )

  const renderFooter = () => {
    if (mode === null) {
      return (
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <div />
        </div>
      )
    }

    if (mode === 'manual_income') {
      return (
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
          <Button variant="secondary" type="button" onClick={onCancel}>
            Cancelar
          </Button>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                resetSaleFlow()
                setMode(null)
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !cashSessionOpen}>
              {submitting ? 'Registrando...' : 'Finalizar entrada'}
            </Button>
          </div>
        </div>
      )
    }

    const isLastStep = productStep === 5
    const isFinalizeBlocked = isLastStep && !receiptSummary.balanced

    return (
      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <div className="flex flex-col items-end gap-1">
          {isFinalizeBlocked ? <p className="text-xs text-gray-500">Confira todos os pagamentos para finalizar.</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" type="button" onClick={backFromProductStep}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            {isLastStep ? (
              <Button
                type="button"
                variant={isFinalizeBlocked ? 'secondary' : 'primary'}
                onClick={() => void handleSubmit()}
                disabled={submitting || !cashSessionOpen || isFinalizeBlocked}
              >
                {submitting ? 'Registrando...' : 'Finalizar venda'}
              </Button>
            ) : (
              <Button type="button" onClick={nextProductStep} disabled={productStep === 3 && items.length === 0}>
                Próximo
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0 bg-white text-gray-950">
      <div className={`flex h-full min-h-0 flex-col ${isBlocked ? 'pointer-events-none blur-[1px] select-none' : ''}`}>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            {mode === null ? renderTypeChooser() : null}
            {mode === 'product_sale' && productStep === 2 ? renderCustomerStep() : null}
            {mode === 'product_sale' && productStep === 3 ? renderProductsStep() : null}
            {mode === 'product_sale' && productStep === 4 ? renderSummaryStep() : null}
            {mode === 'product_sale' && productStep === 5 ? renderReceiptStep() : null}
            {mode === 'manual_income' ? renderManualForm() : null}
          </div>
        </div>

        {renderFooter()}
      </div>

      <CashCustomerQuickCreateModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={handleCustomerCreated}
        initialName={customerDraftName}
      />

      <CashSaleCompletionModal
        open={saleCompletionOpen}
        total={saleCompletionData?.total ?? 0}
        customerName={saleCompletionData?.customerName ?? ''}
        onClose={requestSaleCompletionClose}
      />

      <CashItemInstallmentModal
        key={installmentLine?.id ?? 'installment-closed'}
        open={installmentLine !== null}
        line={installmentLine}
        onClose={() => setInstallmentLine(null)}
        onConfirm={applyInstallmentConfig}
      />

      {isBlocked ? <CashSessionBlockedOverlay onOpenCash={onOpenCash} /> : null}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  emphasis = false,
  labelClassName,
}: {
  label: string
  value: string
  emphasis?: boolean
  labelClassName?: string
}) {
  return (
    <div className={`rounded-md border-2 p-4 ${emphasis ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${labelClassName ?? (emphasis ? 'text-white/70' : 'text-gray-500')}`}>{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-[-0.04em] ${emphasis ? 'text-white' : 'text-gray-950'}`}>{value}</p>
    </div>
  )
}

function roundCurrency(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}
