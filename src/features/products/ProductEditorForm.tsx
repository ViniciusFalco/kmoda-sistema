import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { FormSection } from '../../components/ui/FormSection'
import { Input } from '../../components/ui/Input'
import { QuickCreateModal } from '../../components/ui/QuickCreateModal'
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect'
import { cn, formatCurrencyInput, onlyNumbers, parseCurrencyToNumber } from '../../lib/utils'
import { findProductModelByReference } from '../../lib/catalog'
import type { RegistryInput } from '../../lib/catalog'
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
        setReferenceMessage('Referência já cadastrada. Dados do modelo preenchidos automaticamente.')
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
      setValues((current) => ({
        ...initialValues,
        brand_id: current.brand_id,
        clothing_type_id: current.clothing_type_id,
        family: current.family,
        size_id: current.size_id,
        color_id: current.color_id,
        cost_price: current.cost_price,
        sale_price: current.sale_price,
        suggested_price: current.suggested_price,
        min_stock: current.min_stock,
      }))
      setErrors({})
      setReferenceMessage('')
      nameRef.current?.focus()
    }
  }

  async function handleQuickCreate(values: { name: string; description: string; extra?: string }) {
    if (!quickCreate) {
      return
    }

    setQuickSubmitting(true)
    setQuickError('')

    try {
      const item = await onQuickCreate(quickCreate.kind, {
        name: values.name,
        description: values.description,
        hex: quickCreate.kind === 'colors' ? values.extra ?? null : null,
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

  const brandOptions = toOptions(registries.brands)
  const typeOptions = toOptions(registries.clothingTypes)
  const sizeOptions = toOptions(registries.sizes)
  const colorOptions = registries.colors.map((color) => ({
    value: color.id,
    label: color.name,
    meta: color.hex ?? undefined,
  }))

  return (
    <>
      <form className="flex max-h-[calc(92vh-73px)] flex-col text-gray-950" onSubmit={handleSubmit}>
        <div className="grid flex-1 gap-5 overflow-y-auto p-1 pb-5 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-5">
            <FormSection title="Identificação" description="Informações que aparecem na etiqueta e na busca.">
              <div className="grid gap-4 md:grid-cols-2">
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
                <div className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">Código de barras</span>
                  <div className="flex items-end gap-2">
                    <Input
                      name="barcode"
                      inputMode="text"
                      value={values.barcode}
                      onChange={(event) => updateValue('barcode', event.target.value)}
                      className="flex-1"
                    />
                    <BarcodeScanButton
                      label="Ler código"
                      variant="secondary"
                      layout="inline"
                      onScan={(code) => updateValue('barcode', code)}
                      className="h-10 shrink-0 px-4"
                    />
                  </div>
                </div>
                {referenceMessage ? (
                  <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {referenceMessage}
                  </div>
                ) : null}
              </div>
            </FormSection>

            <FormSection
              title="Detalhes avançados"
              description="Referência e família do modelo para cruzamento interno."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Referência"
                  value={values.reference}
                  onChange={(event) => updateValue('reference', event.target.value)}
                />
                <Input
                  label="Família / grupo"
                  value={values.family}
                  onChange={(event) => updateValue('family', event.target.value)}
                />
              </div>
            </FormSection>

            <FormSection
              title="Classificação"
              description="Use cadastros auxiliares para acelerar lançamentos."
            >
              <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          <div className="space-y-5">
            <FormSection title="Preços e estoque" description="Valores usados nas vendas e alertas de reposição.">
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Preço de custo"
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={values.cost_price}
                  onChange={(event) => updateValue('cost_price', formatCurrencyInput(event.target.value))}
                  error={errors.cost_price}
                  className="text-right font-medium tracking-[0.03em]"
                />
                <Input
                  label="Preço de venda"
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={values.sale_price}
                  onChange={(event) => updateValue('sale_price', formatCurrencyInput(event.target.value))}
                  error={errors.sale_price}
                  required
                  className="text-right font-medium tracking-[0.03em]"
                />
                <Input
                  label="Quantidade inicial em estoque"
                  type="text"
                  inputMode="numeric"
                  value={values.stock_quantity}
                  onChange={(event) => updateValue('stock_quantity', onlyNumbers(event.target.value))}
                  error={errors.stock_quantity}
                  required
                  className="text-right font-medium tracking-[0.03em] md:col-span-2"
                />
              </div>
            </FormSection>

            <FormSection title="Informações extras">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-600">Descrição</span>
                <textarea
                  rows={3}
                  maxLength={180}
                  value={values.description}
                  onChange={(event) => updateValue('description', event.target.value)}
                  className="min-h-[88px] w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Até 180 caracteres.</span>
                  <span>{values.description.length}/180</span>
                </div>
              </label>

              <button
                type="button"
                aria-pressed={values.active}
                onClick={() => updateValue('active', !values.active)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-100',
                  values.active
                    ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100'
                    : 'border-gray-200 bg-white hover:bg-gray-50',
                )}
              >
                <span className="pr-3">
                  <span className="block text-sm font-medium text-gray-900">Produto ativo</span>
                  <span className="mt-1 block text-xs text-gray-500">
                    {values.active ? 'Disponível para uso nas vendas e no estoque.' : 'Produto oculto das rotinas operacionais.'}
                  </span>
                </span>
                <span
                  className={cn(
                    'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition',
                    values.active ? 'border-emerald-300 bg-emerald-200' : 'border-gray-200 bg-gray-100',
                  )}
                >
                  <span
                    className={cn(
                      'h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200',
                      values.active ? 'translate-x-6' : 'translate-x-0',
                    )}
                  />
                </span>
              </button>
            </FormSection>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-gray-200 bg-white px-5 py-4">
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
  if (values.min_stock === '' || Number(values.min_stock) < 0) {
    errors.min_stock = 'Informe um estoque mínimo válido.'
  }
  if (values.cost_price !== '' && parseCurrencyToNumber(values.cost_price) < 0) {
    errors.cost_price = 'Informe um preço de custo válido.'
  }
  if (values.suggested_price !== '' && Number(values.suggested_price) < 0) {
    errors.suggested_price = 'Informe um preço sugerido válido.'
  }

  return errors
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
