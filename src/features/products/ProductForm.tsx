import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BarcodeScanButton } from '../../components/barcode/BarcodeScanButton'
import { Button } from '../../components/ui/Button'
import { FormSection } from '../../components/ui/FormSection'
import { Input } from '../../components/ui/Input'
import { QuickCreateModal } from '../../components/ui/QuickCreateModal'
import { SearchableSelect, type SelectOption } from '../../components/ui/SearchableSelect'
import { normalizeBarcode } from '../../lib/barcode'
import { findProductModelByReference } from '../../lib/catalog'
import type { RegistryInput } from '../../lib/catalog'
import type { Brand, ClothingType, Color, Product, RegistryKind, Size } from '../../types/database'

export type ProductSubmitMode = 'close' | 'another'

export interface ProductFormValues {
  name: string
  barcode: string
  brand_id: string
  clothing_type_id: string
  family: string
  size_id: string
  color_id: string
  reference: string
  cost_price: string
  sale_price: string
  suggested_price: string
  stock_quantity: string
  min_stock: string
  description: string
  active: boolean
}

interface ProductRegistries {
  brands: Brand[]
  clothingTypes: ClothingType[]
  sizes: Size[]
  colors: Color[]
}

interface ProductFormProps {
  product?: Product | null
  registries: ProductRegistries
  submitting?: boolean
  initialBarcode?: string
  onCancel: () => void
  onSubmit: (values: ProductFormValues, mode: ProductSubmitMode) => Promise<boolean>
  onQuickCreate: (kind: RegistryKind, values: RegistryInput) => Promise<{ id: string }>
}

const initialValues: ProductFormValues = {
  name: '',
  barcode: '',
  brand_id: '',
  clothing_type_id: '',
  family: '',
  size_id: '',
  color_id: '',
  reference: '',
  cost_price: '0',
  sale_price: '',
  suggested_price: '',
  stock_quantity: '0',
  min_stock: '0',
  description: '',
  active: true,
}

export function ProductForm({
  product,
  registries,
  submitting = false,
  initialBarcode = '',
  onCancel,
  onSubmit,
  onQuickCreate,
}: ProductFormProps) {
  const nameRef = useRef<HTMLInputElement>(null)
  const autoFilledReferenceRef = useRef('')
  const autoFilledValuesRef = useRef({
    name: '',
    family: '',
    brand_id: '',
    clothing_type_id: '',
  })
  const [referenceMessage, setReferenceMessage] = useState('')
  const [values, setValues] = useState<ProductFormValues>(() =>
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
          cost_price: String(product.cost_price ?? 0),
          sale_price: String(product.sale_price ?? ''),
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
          barcode: normalizeBarcode(initialBarcode),
        },
  )
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [quickCreate, setQuickCreate] = useState<{ kind: RegistryKind; title: string } | null>(null)
  const [quickError, setQuickError] = useState('')
  const [quickSubmitting, setQuickSubmitting] = useState(false)

  useEffect(() => {
    if (product) {
      return
    }

    const reference = values.reference.trim()

    if (!reference) {
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

  async function submit(mode: ProductSubmitMode) {
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

  function updateValue<Key extends keyof ProductFormValues>(key: Key, value: ProductFormValues[Key]) {
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
      <form className="flex max-h-[calc(92vh-73px)] flex-col" onSubmit={handleSubmit}>
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-gray-700">Código de barras</span>
                    <BarcodeScanButton
                      label="Ler código"
                      variant="secondary"
                      onScan={(code) => updateValue('barcode', code)}
                      className="h-9"
                    />
                  </div>
                  <Input
                    name="barcode"
                    inputMode="text"
                    value={values.barcode}
                    onChange={(event) => updateValue('barcode', event.target.value)}
                  />
                </div>
                {referenceMessage ? (
                  <div className="md:col-span-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    {referenceMessage}
                  </div>
                ) : null}
              </div>
            </FormSection>

            <FormSection title="Classificação" description="Use cadastros auxiliares para acelerar lançamentos.">
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
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.cost_price}
                  onChange={(event) => updateValue('cost_price', event.target.value)}
                  error={errors.cost_price}
                />
                <Input
                  label="Preço de venda"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.sale_price}
                  onChange={(event) => updateValue('sale_price', event.target.value)}
                  error={errors.sale_price}
                  required
                />
                <Input
                  label="Preço sugerido"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.suggested_price}
                  onChange={(event) => updateValue('suggested_price', event.target.value)}
                  error={errors.suggested_price}
                />
                <Input
                  label="Quantidade inicial em estoque"
                  type="number"
                  min="0"
                  value={values.stock_quantity}
                  onChange={(event) => updateValue('stock_quantity', event.target.value)}
                  error={errors.stock_quantity}
                  required
                />
                <Input
                  label="Estoque mínimo"
                  type="number"
                  min="0"
                  value={values.min_stock}
                  onChange={(event) => updateValue('min_stock', event.target.value)}
                  error={errors.min_stock}
                  required
                />
              </div>
            </FormSection>

            <FormSection title="Informações extras">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-gray-700">Descrição</span>
                <textarea
                  rows={4}
                  value={values.description}
                  onChange={(event) => updateValue('description', event.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={values.active}
                  onChange={(event) => updateValue('active', event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Produto ativo
              </label>
              <div className="rounded-md border border-gray-100">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-gray-700"
                  onClick={() => setAdvancedOpen((current) => !current)}
                >
                  Detalhes avançados
                  <ChevronDown className={`h-4 w-4 transition ${advancedOpen ? 'rotate-180' : ''}`} />
                </button>
                {advancedOpen ? (
                  <div className="grid gap-3 border-t border-gray-100 p-3 md:grid-cols-2">
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
                ) : null}
              </div>
            </FormSection>
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 flex justify-end gap-2 border-t border-gray-100 bg-white px-5 py-4">
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          {!product ? (
            <Button
              variant="secondary"
              onClick={() => void submit('another')}
              disabled={submitting}
            >
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

function validate(values: ProductFormValues) {
  const errors: Partial<Record<keyof ProductFormValues, string>> = {}

  if (!values.name.trim()) {
    errors.name = 'Informe o nome do produto.'
  }
  if (!values.sale_price || Number(values.sale_price) <= 0) {
    errors.sale_price = 'Informe um preço de venda válido.'
  }
  if (values.stock_quantity === '' || Number(values.stock_quantity) < 0) {
    errors.stock_quantity = 'Informe uma quantidade válida.'
  }
  if (values.min_stock === '' || Number(values.min_stock) < 0) {
    errors.min_stock = 'Informe um estoque mínimo válido.'
  }
  if (values.cost_price !== '' && Number(values.cost_price) < 0) {
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

function fieldForKind(kind: RegistryKind): keyof ProductFormValues {
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
