import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { FormSection } from '../../components/ui/FormSection'
import { Input } from '../../components/ui/Input'
import { QuickCreateModal } from '../../components/ui/QuickCreateModal'
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect'
import { findProductModelByReference } from '../../lib/catalog'
import type { RegistryInput } from '../../lib/catalog'
import { cn, formatCurrencyInput, onlyNumbers, parseCurrencyToNumber } from '../../lib/utils'
import type { Brand, ClothingType, Color, Product, RegistryKind, Size } from '../../types/database'
import type { ProductFormValues, ProductSubmitMode } from './ProductForm'

export type ProductEditorFormValues = ProductFormValues
export type ProductEditorSubmitMode = ProductSubmitMode

interface ProductRegistries {
  brands: Brand[]
  clothingTypes: ClothingType[]
  sizes: Size[]
  colors: Color[]
}

interface ProductEditorFormProps {
  product?: Product | null
  registries: ProductRegistries
  submitting?: boolean
  initialBarcode?: string
  error?: string
  onCancel: () => void
  onSubmit: (values: ProductEditorFormValues, mode: ProductEditorSubmitMode) => Promise<boolean>
  onQuickCreate: (kind: RegistryKind, values: RegistryInput) => Promise<{ id: string }>
}

const initialValues: ProductEditorFormValues = {
  name: '',
  barcode: '',
  brand_id: '',
  clothing_type_id: '',
  family: '',
  size_id: '',
  color_id: '',
  reference: '',
  cost_price: formatCurrencyInput('0'),
  sale_price: '',
  suggested_price: '',
  stock_quantity: '0',
  min_stock: '0',
  description: '',
  active: true,
}

export function ProductEditorForm({
  product,
  registries,
  submitting = false,
  initialBarcode = '',
  error = '',
  onCancel,
  onSubmit,
  onQuickCreate,
}: ProductEditorFormProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const autoFilledReferenceRef = useRef('')
  const autoFilledValuesRef = useRef({
    name: '',
    family: '',
    brand_id: '',
    clothing_type_id: '',
  })
  const [referenceMessage, setReferenceMessage] = useState('')
  const [values, setValues] = useState<ProductEditorFormValues>(() =>
    product
      ? {
          name: product.product_model?.name ?? product.name,
          barcode: product.barcode ?? '',
          brand_id: product.product_model?.brand_id ?? product.brand_id ?? '',
          clothing_type_id: product.product_model?.category_id ?? product.clothing_type_id ?? '',
          family: product.product_model?.family ?? '',
          size_id: product.size_id ?? '',
          color_id: product.color_id ?? '',
          reference: product.product_model?.reference ?? product.reference ?? '',
          cost_price: formatCurrencyInput(String(Math.round((product.cost_price ?? 0) * 100))),
          sale_price: formatCurrencyInput(String(Math.round((product.sale_price ?? 0) * 100))),
          suggested_price:
            product.suggested_price === null || product.suggested_price === undefined
              ? ''
              : String(product.suggested_price),
          stock_quantity: String(product.stock_quantity ?? 0),
          min_stock: String(product.min_stock ?? 0),
          description: product.description ?? '',
          active: product.active,
        }
      : {
          ...initialValues,
          barcode: initialBarcode,
        },
  )
  const [profitMargin, setProfitMargin] = useState(() => calculateProfitMargin(values.cost_price, values.sale_price))
  const [errors, setErrors] = useState<Partial<Record<keyof ProductEditorFormValues, string>>>({})
  const [quickCreate, setQuickCreate] = useState<{ kind: RegistryKind; title: string } | null>(null)
  const [quickError, setQuickError] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)

  useEffect(() => {
    if (product) {
      return
    }

    const reference = values.reference.trim()

    if (!reference) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReferenceMessage('')
      return
    }

    const timeout = window.setTimeout(async () => {
      try {
        const model = await findProductModelByReference(reference)

        if (!model) {
          if (autoFilledReferenceRef.current && autoFilledReferenceRef.current !== reference) {
            setValues((current) => {
              const next = { ...current }

              if (current.name === autoFilledValuesRef.current.name) {
                next.name = ''
              }

              if (current.family === autoFilledValuesRef.current.family) {
                next.family = ''
              }

              if (current.brand_id === autoFilledValuesRef.current.brand_id) {
                next.brand_id = ''
              }

              if (current.clothing_type_id === autoFilledValuesRef.current.clothing_type_id) {
                next.clothing_type_id = ''
              }

              return next
            })
          }

          setReferenceMessage('')
          return
        }

        const autoValues = {
          name: model.name,
          family: model.family ?? '',
          brand_id: model.brand_id ?? '',
          clothing_type_id: model.category_id ?? '',
        }

        setValues((current) => ({
          ...current,
          name: autoValues.name,
          family: autoValues.family,
          brand_id: autoValues.brand_id,
          clothing_type_id: autoValues.clothing_type_id,
        }))

        autoFilledReferenceRef.current = reference
        autoFilledValuesRef.current = autoValues
        setReferenceMessage('Referência encontrada: dados do modelo preenchidos automaticamente.')
      } catch {
        setReferenceMessage('')
      }
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [product, values.reference])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submit('close')
  }

  async function submit(mode: ProductEditorSubmitMode) {
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const success = await onSubmit(values, mode)

    if (success && mode === 'another') {
      const nextValues = {
        ...initialValues,
        brand_id: values.brand_id,
        clothing_type_id: values.clothing_type_id,
        family: values.family,
        size_id: values.size_id,
        color_id: values.color_id,
        cost_price: values.cost_price,
        sale_price: values.sale_price,
        suggested_price: values.suggested_price,
        min_stock: values.min_stock,
      }

      setValues(nextValues)
      setProfitMargin(calculateProfitMargin(nextValues.cost_price, nextValues.sale_price))
      setErrors({})
      setReferenceMessage('')
      nameRef.current?.focus()
    }
  }

  async function handleQuickCreate(formValues: { name: string; description: string; extra?: string }) {
    if (!quickCreate) {
      return
    }

    setQuickSubmitting(true)
    setQuickError('')

    try {
      const item = await onQuickCreate(quickCreate.kind, {
        name: formValues.name,
        description: formValues.description,
        hex: quickCreate.kind === 'colors' ? formValues.extra ?? null : null,
        active: true,
      })
      updateValue(fieldForKind(quickCreate.kind), item.id)
      setQuickCreate(null)
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : 'Não foi possível criar o item.')
    } finally {
      setQuickSubmitting(false)
    }
  }

  function updateValue<Key extends keyof ProductEditorFormValues>(key: Key, value: ProductEditorFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateCostPrice(nextValue: string) {
    const formatted = formatCurrencyInput(nextValue)
    const nextSalePrice = calculateSalePrice(formatted, profitMargin)

    setValues((current) => ({
      ...current,
      cost_price: formatted,
      sale_price: nextSalePrice ?? current.sale_price,
    }))
  }

  function updateProfitMargin(nextValue: string) {
    const sanitized = sanitizePercentageInput(nextValue)
    const nextSalePrice = calculateSalePrice(values.cost_price, sanitized)

    setProfitMargin(sanitized)
    if (!nextSalePrice) {
      return
    }

    setValues((current) => ({
      ...current,
      sale_price: nextSalePrice,
    }))
  }

  const brandOptions = toOptions(registries.brands)
  const typeOptions = toOptions(registries.clothingTypes)
  const sizeOptions = toOptions(registries.sizes)
  const colorOptions = registries.colors.map((color) => ({
    value: color.id,
    label: color.name,
    meta: color.hex ?? undefined,
  }))
  const validationMessages = Object.values(errors).filter(Boolean)
  const visibleError = error || validationMessages[0] || ''

  return (
    <>
      <form className="flex h-full min-h-0 flex-col text-gray-950" onSubmit={handleSubmit}>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {visibleError ? (
            <div
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {visibleError}
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <FormSection title="Identificação do modelo">
                <div className="space-y-4">
                  <Input
                    ref={nameRef}
                    label="Nome do produto"
                    name="name"
                    value={values.name}
                    autoFocus
                    onChange={(event) => updateValue('name', event.target.value)}
                    error={errors.name}
                    required
                  />

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">
                      Código de barras
                    </span>
                    <div className="space-y-2">
                      <Input
                        name="barcode"
                        inputMode="text"
                        value={values.barcode}
                        onChange={(event) => updateValue('barcode', event.target.value)}
                      />
                      <div className="[&>div]:flex [&>div]:w-full [&>div>button]:w-full">
                        <BarcodeScanButton
                          label="Ler código de barras"
                          variant="secondary"
                          layout="inline"
                          onScan={(code) => updateValue('barcode', code)}
                          className="h-9 w-full px-4"
                        />
                      </div>
                    </div>
                  </div>

                  <Input
                    label="Referência"
                    value={values.reference}
                    onChange={(event) => updateValue('reference', event.target.value)}
                    placeholder="Código ou referência do modelo"
                  />
                  <Input
                    label="Família / grupo"
                    value={values.family}
                    onChange={(event) => updateValue('family', event.target.value)}
                    placeholder="Ex: feminino básico"
                  />

                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Ao informar uma referência já existente, o sistema pode preencher nome, família, marca e tipo
                    automaticamente.
                  </div>

                  {referenceMessage ? (
                    <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                      {referenceMessage}
                    </div>
                  ) : null}
                </div>
              </FormSection>
            </div>

            <div className="space-y-4">
              <FormSection title="Classificação">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  <SearchableSelect
                    label="Marca"
                    placeholder="Selecione a marca"
                    value={values.brand_id}
                    options={brandOptions}
                    onChange={(value) => updateValue('brand_id', value)}
                    quickCreateLabel="+ Nova marca"
                    onQuickCreate={() => setQuickCreate({ kind: 'brands', title: 'Nova marca' })}
                  />
                  <SearchableSelect
                    label="Tipo de roupa"
                    placeholder="Selecione o tipo"
                    value={values.clothing_type_id}
                    options={typeOptions}
                    onChange={(value) => updateValue('clothing_type_id', value)}
                    quickCreateLabel="+ Novo tipo"
                    onQuickCreate={() => setQuickCreate({ kind: 'clothing_types', title: 'Novo tipo de roupa' })}
                  />
                  <SearchableSelect
                    label="Tamanho"
                    placeholder="Selecione o tamanho"
                    value={values.size_id}
                    options={sizeOptions}
                    onChange={(value) => updateValue('size_id', value)}
                    quickCreateLabel="+ Novo tamanho"
                    onQuickCreate={() => setQuickCreate({ kind: 'sizes', title: 'Novo tamanho' })}
                  />
                  <SearchableSelect
                    label="Cor"
                    placeholder="Selecione a cor"
                    value={values.color_id}
                    options={colorOptions}
                    onChange={(value) => updateValue('color_id', value)}
                    quickCreateLabel="+ Nova cor"
                    onQuickCreate={() => setQuickCreate({ kind: 'colors', title: 'Nova cor' })}
                  />
                </div>
              </FormSection>

              <button
                type="button"
                aria-pressed={values.active}
                onClick={() => updateValue('active', !values.active)}
                className={cn(
                  'flex w-full items-center justify-between gap-4 rounded-xl border-2 px-4 py-3 text-left transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
                  values.active
                    ? 'border-emerald-600 bg-emerald-100 hover:bg-emerald-200'
                    : 'border-rose-300 bg-rose-50 hover:bg-rose-100',
                )}
              >
                <span className="block text-sm font-semibold text-gray-950">
                  {values.active ? 'Produto ativo' : 'Produto inativo'}
                </span>
                <span
                  className={cn(
                    'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 p-1 transition',
                    values.active ? 'border-emerald-700 bg-emerald-600' : 'border-rose-400 bg-rose-200',
                  )}
                >
                  <span
                    className={cn(
                      'h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
                      values.active ? 'translate-x-6' : 'translate-x-0',
                    )}
                  />
                </span>
              </button>
            </div>

            <div className="space-y-4 lg:col-span-2 xl:col-span-1 xl:min-w-0">
              <FormSection title="Preços e estoque">
                <div className="space-y-4">
                  <CurrencyField
                    label="Preço de custo"
                    value={values.cost_price}
                    onChange={(event) => updateCostPrice(event.target.value)}
                    error={errors.cost_price}
                    placeholder="0,00"
                  />
                  <PercentField
                    label="Margem de lucro"
                    value={profitMargin}
                    onChange={(event) => updateProfitMargin(event.target.value)}
                    placeholder="0"
                  />
                  <CurrencyField
                    label="Preço de venda"
                    value={values.sale_price}
                    onChange={(event) => updateValue('sale_price', formatCurrencyInput(event.target.value))}
                    error={errors.sale_price}
                    placeholder="0,00"
                    required
                  />
                  <Input
                    label="Quantidade em estoque"
                    type="text"
                    inputMode="numeric"
                    value={values.stock_quantity}
                    onChange={(event) => updateValue('stock_quantity', onlyNumbers(event.target.value))}
                    error={errors.stock_quantity}
                    required
                    className="text-right"
                    labelClassName="whitespace-nowrap"
                  />

                  <div className="space-y-1.5">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">
                      Descrição curta
                    </span>
                    <input
                      type="text"
                      maxLength={100}
                      value={values.description}
                      onChange={(event) => updateValue('description', event.target.value)}
                      placeholder="Ex: cropped canelado preto"
                      className="h-9 w-full rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-100"
                    />
                    <div className="text-right text-[11px] text-gray-500">{values.description.length}/100</div>
                  </div>
                </div>
              </FormSection>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t-2 border-gray-200 bg-white px-4 py-4 sm:px-5">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          {!product ? (
            <Button variant="secondary" onClick={() => void submit('another')} disabled={submitting}>
              Salvar e cadastrar outro
            </Button>
          ) : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : 'Salvar produto'}
          </Button>
        </div>
      </form>

      <QuickCreateModal
        open={Boolean(quickCreate)}
        title={quickCreate?.title ?? ''}
        extraLabel={quickCreate?.kind === 'colors' ? 'Código da cor' : undefined}
        extraPlaceholder={quickCreate?.kind === 'colors' ? '#000000' : undefined}
        submitting={quickSubmitting}
        error={quickError}
        onClose={() => setQuickCreate(null)}
        onSubmit={handleQuickCreate}
      />
    </>
  )
}

function validate(values: ProductEditorFormValues) {
  const errors: Partial<Record<keyof ProductEditorFormValues, string>> = {}

  if (!values.name.trim()) {
    errors.name = 'Informe o nome do produto.'
  }
  if (!values.sale_price || parseCurrencyToNumber(values.sale_price) <= 0) {
    errors.sale_price = 'Informe um preço de venda válido.'
  }
  if (values.stock_quantity === '' || Number(values.stock_quantity) < 0) {
    errors.stock_quantity = 'Informe uma quantidade válida.'
  }
  if (values.cost_price !== '' && parseCurrencyToNumber(values.cost_price) < 0) {
    errors.cost_price = 'Informe um preço de custo válido.'
  }

  return errors
}

function CurrencyField({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600 whitespace-nowrap">
        {label}
      </span>
      <div
        className={cn(
          'flex h-9 items-center rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus-within:border-gray-500 focus-within:ring-2 focus-within:ring-gray-100',
          error && 'border-red-400 focus-within:border-red-500 focus-within:ring-red-50',
          className,
        )}
      >
        <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">R$</span>
        <input
          {...props}
          type="text"
          inputMode="numeric"
          className="min-w-0 flex-1 bg-transparent px-2 text-right font-medium tracking-[0.03em] outline-none placeholder:text-gray-400"
        />
      </div>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

function PercentField({
  label,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600 whitespace-nowrap">
        {label}
      </span>
      <div
        className={cn(
          'flex h-9 items-center rounded-md border-2 border-gray-300 bg-white px-3 text-sm text-gray-900 transition focus-within:border-gray-500 focus-within:ring-2 focus-within:ring-gray-100',
          error && 'border-red-400 focus-within:border-red-500 focus-within:ring-red-50',
          className,
        )}
      >
        <input
          {...props}
          type="text"
          inputMode="decimal"
          className="min-w-0 flex-1 bg-transparent text-right font-medium outline-none placeholder:text-gray-400"
        />
        <span className="ml-2 shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">%</span>
      </div>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  )
}

function toOptions(items: Array<{ id: string; name: string; active: boolean }>): SelectOption[] {
  return items
    .filter((item) => item.active)
    .map((item) => ({
      value: item.id,
      label: item.name,
    }))
}

function fieldForKind(kind: RegistryKind): keyof ProductEditorFormValues {
  if (kind === 'brands') {
    return 'brand_id'
  }
  if (kind === 'clothing_types') {
    return 'clothing_type_id'
  }
  if (kind === 'sizes') {
    return 'size_id'
  }
  return 'color_id'
}

function sanitizePercentageInput(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\./g, ',')
  const [whole = '', ...fractionParts] = normalized.split(',')
  const fraction = fractionParts.join('')

  if (!fractionParts.length) {
    return whole
  }

  return `${whole},${fraction.slice(0, 2)}`
}

function parsePercentageValue(value: string) {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function calculateSalePrice(costPrice: string, margin: string) {
  const cost = parseCurrencyToNumber(costPrice)
  const parsedMargin = parsePercentageValue(margin)

  if (cost <= 0 || margin.trim() === '') {
    return cost > 0 && parsedMargin === 0 && margin.trim() !== '' ? formatCurrencyFromNumber(cost) : null
  }

  return formatCurrencyFromNumber(cost + cost * (parsedMargin / 100))
}

function calculateProfitMargin(costPrice: string, salePrice: string) {
  const cost = parseCurrencyToNumber(costPrice)
  const sale = parseCurrencyToNumber(salePrice)

  if (cost <= 0 || sale <= 0) {
    return ''
  }

  const margin = ((sale - cost) / cost) * 100
  return formatPercentageValue(margin)
}

function formatCurrencyFromNumber(value: number) {
  return formatCurrencyInput(String(Math.round(value * 100)))
}

function formatPercentageValue(value: number) {
  const normalized = value.toFixed(2).replace('.', ',')
  return normalized.replace(/,00$/, '').replace(/(,\d)0$/, '$1')
}
