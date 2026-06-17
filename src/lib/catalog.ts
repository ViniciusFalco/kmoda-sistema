import type { User } from '@supabase/supabase-js'
import { normalizeBarcode } from './barcode'
import { supabase } from './supabase'
import type {
  Brand,
  CashMovement,
  CashHistoryEntry,
  CashHistoryMovement,
  CashSession,
  CashSessionHistoryEvent,
  CashMovementType,
  ClothingType,
  Color,
  Customer,
  PaymentMethod,
  Product,
  ProductModel,
  ProductSnapshot,
  SalePayment,
  SalePaymentSourceKind,
  SalePricingKind,
  Sale,
  SaleItem,
  RegistryItem,
  RegistryKind,
  Size,
  StockMovement,
  StockMovementReason,
  StockMovementType,
} from '../types/database'
import { formatCurrencyBRL, formatDateBR, todayISODate } from './utils'

type RegistryTableMap = {
  brands: Brand
  clothing_types: ClothingType
  sizes: Size
  colors: Color
}

function getSupabase() {
  if (!supabase) {
    throw new Error('Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  }

  return supabase
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Não foi possível concluir a operação.'
}

function normalizeNullable(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeNumber(value: number | null | undefined, fallback = 0) {
  return value === null || value === undefined ? fallback : Number(value)
}

function roundCurrency(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function normalizeProductModel(model: ProductModel): ProductModel {
  return {
    ...model,
    reference: normalizeNullable(model.reference) ?? '',
    name: model.name.trim(),
    family: normalizeNullable(model.family),
  }
}

function normalizeProduct(product: Product): Product {
  const productModel = product.product_model ? normalizeProductModel(product.product_model) : null

  return {
    ...product,
    name: productModel?.name ?? product.name,
    reference: productModel?.reference ?? normalizeNullable(product.reference),
    brand_id: product.brand_id ?? productModel?.brand_id ?? null,
    clothing_type_id: product.clothing_type_id ?? productModel?.category_id ?? null,
    cost_price: normalizeNumber(product.cost_price),
    sale_price: normalizeNumber(product.sale_price),
    suggested_price:
      product.suggested_price === null || product.suggested_price === undefined
        ? null
        : Number(product.suggested_price),
    stock_quantity: normalizeNumber(product.stock_quantity),
    min_stock: normalizeNumber(product.min_stock),
    active: Boolean(product.active),
    product_model: productModel,
  }
}

function normalizeProductSnapshot(snapshot?: ProductSnapshot | null): ProductSnapshot | null {
  if (!snapshot) {
    return null
  }

  const name = normalizeNullable(snapshot.name)

  if (!name) {
    return null
  }

  return {
    id: normalizeNullable(snapshot.id),
    name,
    barcode: normalizeNullable(snapshot.barcode),
    reference: normalizeNullable(snapshot.reference),
    product_model_id: normalizeNullable(snapshot.product_model_id),
    product_model_name: normalizeNullable(snapshot.product_model_name),
    product_model_reference: normalizeNullable(snapshot.product_model_reference),
    product_model_family: normalizeNullable(snapshot.product_model_family),
    brand_id: normalizeNullable(snapshot.brand_id),
    brand_name: normalizeNullable(snapshot.brand_name),
    clothing_type_id: normalizeNullable(snapshot.clothing_type_id),
    clothing_type_name: normalizeNullable(snapshot.clothing_type_name),
    size_id: normalizeNullable(snapshot.size_id),
    size_name: normalizeNullable(snapshot.size_name),
    color_id: normalizeNullable(snapshot.color_id),
    color_name: normalizeNullable(snapshot.color_name),
  }
}

function buildSnapshotBrand(id: string | null | undefined, name?: string | null, timestamp = new Date().toISOString()): Brand | null {
  const normalizedName = normalizeNullable(name)

  if (!normalizedName) {
    return null
  }

  return {
    id: id ?? '',
    name: normalizedName,
    description: null,
    active: true,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function buildSnapshotClothingType(
  id: string | null | undefined,
  name?: string | null,
  timestamp = new Date().toISOString(),
): ClothingType | null {
  const normalizedName = normalizeNullable(name)

  if (!normalizedName) {
    return null
  }

  return {
    id: id ?? '',
    name: normalizedName,
    description: null,
    active: true,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function buildSnapshotSize(id: string | null | undefined, name?: string | null, timestamp = new Date().toISOString()): Size | null {
  const normalizedName = normalizeNullable(name)

  if (!normalizedName) {
    return null
  }

  return {
    id: id ?? '',
    name: normalizedName,
    sort_order: null,
    active: true,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function buildSnapshotColor(id: string | null | undefined, name?: string | null, timestamp = new Date().toISOString()): Color | null {
  const normalizedName = normalizeNullable(name)

  if (!normalizedName) {
    return null
  }

  return {
    id: id ?? '',
    name: normalizedName,
    hex: null,
    active: true,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function buildSnapshotProductModel(snapshot: ProductSnapshot, timestamp = new Date().toISOString()): ProductModel | null {
  const name = normalizeNullable(snapshot.product_model_name ?? snapshot.name)
  const reference = normalizeNullable(snapshot.product_model_reference ?? snapshot.reference)

  if (!name && !reference && !snapshot.product_model_family) {
    return null
  }

  const brand = buildSnapshotBrand(snapshot.brand_id, snapshot.brand_name, timestamp)
  const category = buildSnapshotClothingType(snapshot.clothing_type_id, snapshot.clothing_type_name, timestamp)

  return {
    id: snapshot.product_model_id ?? snapshot.id ?? '',
    user_id: null,
    reference: reference ?? '',
    name: name ?? reference ?? 'Produto',
    family: normalizeNullable(snapshot.product_model_family),
    brand_id: snapshot.brand_id ?? null,
    category_id: snapshot.clothing_type_id ?? null,
    created_at: timestamp,
    updated_at: timestamp,
    brand,
    category,
  }
}

function buildProductSnapshot(product: Product): ProductSnapshot {
  const productModel = product.product_model
  const brand = productModel?.brand ?? product.brand
  const clothingType = productModel?.category ?? product.clothing_type

  return {
    id: product.id,
    name: productModel?.name ?? product.name,
    barcode: normalizeNullable(product.barcode),
    reference: normalizeNullable(product.reference ?? productModel?.reference),
    product_model_id: product.product_model_id ?? productModel?.id ?? null,
    product_model_name: normalizeNullable(productModel?.name ?? product.name),
    product_model_reference: normalizeNullable(productModel?.reference ?? product.reference),
    product_model_family: normalizeNullable(productModel?.family),
    brand_id: product.brand_id ?? productModel?.brand_id ?? null,
    brand_name: normalizeNullable(brand?.name),
    clothing_type_id: product.clothing_type_id ?? productModel?.category_id ?? null,
    clothing_type_name: normalizeNullable(clothingType?.name),
    size_id: product.size_id ?? null,
    size_name: normalizeNullable(product.size?.name),
    color_id: product.color_id ?? null,
    color_name: normalizeNullable(product.color?.name),
  }
}

function hydrateProductSnapshot(
  snapshot?: ProductSnapshot | null,
  fallback?: { id?: string | null; created_at?: string | null; updated_at?: string | null },
): Product | null {
  const normalizedSnapshot = normalizeProductSnapshot(snapshot)

  if (!normalizedSnapshot) {
    return null
  }

  const timestamp = fallback?.created_at ?? fallback?.updated_at ?? new Date().toISOString()
  const productModel = buildSnapshotProductModel(normalizedSnapshot, timestamp)
  const brand = buildSnapshotBrand(normalizedSnapshot.brand_id, normalizedSnapshot.brand_name, timestamp)
  const clothingType = buildSnapshotClothingType(normalizedSnapshot.clothing_type_id, normalizedSnapshot.clothing_type_name, timestamp)
  const size = buildSnapshotSize(normalizedSnapshot.size_id, normalizedSnapshot.size_name, timestamp)
  const color = buildSnapshotColor(normalizedSnapshot.color_id, normalizedSnapshot.color_name, timestamp)

  return normalizeProduct({
    id: normalizedSnapshot.id ?? fallback?.id ?? productModel?.id ?? '',
    user_id: null,
    name: normalizedSnapshot.name,
    barcode: normalizedSnapshot.barcode ?? null,
    product_model_id: normalizedSnapshot.product_model_id ?? null,
    brand_id: normalizedSnapshot.brand_id ?? null,
    clothing_type_id: normalizedSnapshot.clothing_type_id ?? null,
    size_id: normalizedSnapshot.size_id ?? null,
    color_id: normalizedSnapshot.color_id ?? null,
    reference: normalizedSnapshot.reference ?? normalizedSnapshot.product_model_reference ?? null,
    cost_price: 0,
    sale_price: 0,
    suggested_price: null,
    stock_quantity: 0,
    min_stock: 0,
    description: null,
    active: false,
    created_at: timestamp,
    updated_at: timestamp,
    product_model: productModel,
    brand,
    clothing_type: clothingType,
    size,
    color,
  })
}

function normalizeSalePayment(payment: SalePayment): SalePayment {
  const installmentsCount = normalizeNumber(payment.installments_count, 1)
  const amount = normalizeNumber(payment.amount)
  const installmentValue = payment.installment_value === null || payment.installment_value === undefined
    ? amount / Math.max(1, installmentsCount)
    : Number(payment.installment_value)

  return {
    ...payment,
    source_kind: (payment.source_kind ?? 'cash_total') as SalePaymentSourceKind,
    amount,
    installments_count: installmentsCount,
    installment_value: installmentValue,
  }
}

function normalizeSaleItem(item: SaleItem): SaleItem {
  const pricingKind = (item.pricing_kind ?? 'cash') as SalePricingKind
  const quantity = normalizeNumber(item.quantity, 1)
  const unitPrice = normalizeNumber(item.unit_price)
  const totalPrice = normalizeNumber(item.total_price, quantity * unitPrice)
  const installmentsCount = normalizeNumber(item.installments_count, 1)
  const originalUnitPrice = item.original_unit_price === null || item.original_unit_price === undefined
    ? unitPrice
    : Number(item.original_unit_price)
  const installmentValue = item.installment_value === null || item.installment_value === undefined
    ? totalPrice / Math.max(1, installmentsCount)
    : Number(item.installment_value)
  const product = item.product
    ? normalizeProduct(item.product)
    : hydrateProductSnapshot(item.product_snapshot ?? null, {
        id: item.product_id,
        created_at: item.created_at,
        updated_at: item.created_at,
      })

  return {
    ...item,
    quantity,
    pricing_kind: pricingKind,
    original_unit_price: originalUnitPrice,
    unit_price: unitPrice,
    total_price: totalPrice,
    installments_count: installmentsCount,
    installment_value: installmentValue,
    product_snapshot: normalizeProductSnapshot(item.product_snapshot ?? null),
    product,
  }
}

export function normalizeSaleWithRelations(sale: Sale): Sale {
  return {
    ...sale,
    total_amount: normalizeNumber(sale.total_amount),
    installments_count: normalizeNumber(sale.installments_count, 1),
    customer: sale.customer ?? null,
    sale_items: sale.sale_items?.map(normalizeSaleItem),
    sale_payments: sale.sale_payments?.map(normalizeSalePayment),
  }
}

function buildCashHistoryMovementFromSale(sale: Sale): CashHistoryMovement {
  const normalizedSale = normalizeSaleWithRelations(sale)
  const itemNames = normalizedSale.sale_items
    ?.map((item) => item.product?.product_model?.name ?? item.product?.name)
    .filter(Boolean)

  return {
    kind: 'movement',
    id: normalizedSale.id,
    user_id: normalizedSale.user_id ?? null,
    created_by: null,
    sale_id: normalizedSale.id,
    sale_payment_id: null,
    cash_session_id: null,
    movement_code: null,
    type: 'income',
    origin: 'sale',
    description: itemNames?.length ? itemNames.join(', ') : 'Venda',
    amount: normalizeNumber(normalizedSale.total_amount),
    movement_date: normalizedSale.sale_date,
    payment_method: normalizedSale.payment_method ?? null,
    notes: null,
    created_at: normalizedSale.created_at,
    updated_at: normalizedSale.updated_at,
    sale: normalizedSale,
    sale_payment: null,
  }
}

function normalizeCashMovement(movement: CashMovement): CashMovement {
  const legacyType = movement.type as CashMovementType | 'entrada' | 'saida'
  const type: CashMovementType = legacyType === 'entrada' ? 'income' : legacyType === 'saida' ? 'expense' : legacyType

  return {
    ...movement,
    type,
    origin: movement.origin ?? (movement.sale_id ? 'sale' : type === 'income' ? 'manual_income' : 'manual_expense'),
    amount: Math.abs(normalizeNumber(movement.amount)),
    sale_payment: movement.sale_payment ? normalizeSalePayment(movement.sale_payment) : null,
    sale: movement.sale ? normalizeSaleWithRelations(movement.sale) : null,
  }
}

function normalizeStockMovement(movement: StockMovement): StockMovement {
  return {
    ...movement,
    product_snapshot: normalizeProductSnapshot(movement.product_snapshot ?? null),
    product: movement.product
      ? normalizeProduct(movement.product)
      : hydrateProductSnapshot(movement.product_snapshot ?? null, {
          id: movement.product_id,
          created_at: movement.created_at,
          updated_at: movement.created_at,
        }),
    sale: movement.sale ? normalizeSaleWithRelations(movement.sale) : null,
    cash_movement: movement.cash_movement ? normalizeCashMovement(movement.cash_movement) : null,
  }
}

export function normalizeStockMovementWithRelations(movement: StockMovement): StockMovement {
  return normalizeStockMovement(movement)
}

export function formatPaymentMethodLabel(method?: PaymentMethod | null, installmentsCount = 1) {
  if (!method) {
    return '-'
  }

  if (method === 'dinheiro') {
    return 'Dinheiro'
  }

  if (method === 'pix') {
    return 'Pix'
  }

  if (method === 'cartao_debito') {
    return 'Débito'
  }

  if (method === 'cartao_credito') {
    return installmentsCount > 1 ? `Crédito parcelado ${installmentsCount}x` : 'Crédito à vista'
  }

  return 'Outro'
}

export function formatUserRoleLabel(role?: string | null) {
  if (!role) {
    return '-'
  }

  const labels: Record<string, string> = {
    admin: 'Administradora',
    cashier: 'Operadora de caixa',
    operator: 'Operadora',
  }

  return labels[role] ?? role
}

export function formatSalePaymentSummary(sale?: Sale | null) {
  if (!sale) {
    return '-'
  }

  if (sale.sale_payments && sale.sale_payments.length > 0) {
    return sale.sale_payments
      .map((payment) => `${formatPaymentMethodLabel(payment.payment_method, payment.installments_count)} · ${formatCurrencyBRL(payment.amount)}`)
      .join(' + ')
  }

  return sale.payment_method
    ? `${formatPaymentMethodLabel(sale.payment_method, sale.installments_count)} · ${formatCurrencyBRL(sale.total_amount)}`
    : '-'
}

export function getSaleConditionTotals(sale?: Sale | null) {
  const cashSubtotal = sale?.sale_items?.reduce((sum, item) => {
    const total = normalizeNumber(item.total_price)
    return sum + (item.pricing_kind === 'installment' ? 0 : total)
  }, 0) ?? 0

  const installmentSubtotal = sale?.sale_items?.reduce((sum, item) => {
    const total = normalizeNumber(item.total_price)
    return sum + (item.pricing_kind === 'installment' ? total : 0)
  }, 0) ?? 0

  return {
    cashSubtotal: roundCurrency(cashSubtotal),
    installmentSubtotal: roundCurrency(installmentSubtotal),
    total: roundCurrency(cashSubtotal + installmentSubtotal),
  }
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function requireUuid(value: string | null | undefined) {
  if (!value || !isUuidLike(value)) {
    throw new Error(`Abra o caixa para registrar vendas ou gastos.`)
  }

  return value
}

function sameProductModel(product: Product, model: ProductModel) {
  const productReference = normalizeNullable(product.reference)
  const modelReference = normalizeNullable(model.reference)

  if (product.product_model_id && product.product_model_id === model.id) {
    return true
  }

  if (productReference && modelReference) {
    return normalizeText(productReference) === normalizeText(modelReference)
  }

  return false
}

function compareSuggestedProducts(a: Product, b: Product, currentName: string) {
  const aScore = scoreSuggestedProduct(a, currentName)
  const bScore = scoreSuggestedProduct(b, currentName)

  if (aScore !== bScore) {
    return bScore - aScore
  }

  if (a.stock_quantity !== b.stock_quantity) {
    return b.stock_quantity - a.stock_quantity
  }

  return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
}

function scoreSuggestedProduct(product: Product, currentName: string) {
  const candidateName = normalizeText(product.product_model?.name ?? product.name)
  const current = normalizeText(currentName)
  let score = 0

  if (!current) {
    return product.stock_quantity
  }

  if (candidateName === current) {
    score += 40
  }

  if (candidateName.includes(current) || current.includes(candidateName)) {
    score += 25
  }

  const currentWords = current.split(/\s+/).filter((word) => word.length > 2)
  const candidateWords = new Set(candidateName.split(/\s+/).filter((word) => word.length > 2))

  score += currentWords.reduce((total, word) => total + (candidateWords.has(word) ? 4 : 0), 0)
  score += Math.min(product.stock_quantity, 20)

  return score
}

async function syncProductsForModel(model: ProductModel) {
  const client = getSupabase()
  const { error } = await client
    .from('products')
    .update({
      name: model.name,
      reference: normalizeNullable(model.reference),
      brand_id: model.brand_id ?? null,
      clothing_type_id: model.category_id ?? null,
    })
    .eq('product_model_id', model.id)

  if (error) {
    throw new Error(error.message)
  }
}

async function updateProductModelById(modelId: string, input: ProductInput, user: User | null) {
  const client = getSupabase()
  const existingModel = await loadProductModelById(modelId)

  if (!existingModel) {
    throw new Error('Modelo do produto não encontrado.')
  }

  const payload = buildProductModelPayload(input, user, existingModel)
  const { data, error } = await client
    .from('product_models')
    .update(payload as never)
    .eq('id', modelId)
    .select(productModelSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const model = normalizeProductModel(data as unknown as ProductModel)
  await syncProductsForModel(model)
  return model
}

async function loadProductModelById(modelId: string) {
  const client = getSupabase()
  const { data, error } = await client.from('product_models').select(productModelSelect).eq('id', modelId).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeProductModel(data as unknown as ProductModel) : null
}

export interface RegistryInput {
  name: string
  description?: string | null
  active?: boolean
  sort_order?: number | null
  hex?: string | null
}

export async function listRegistryItems<K extends RegistryKind>(kind: K) {
  const client = getSupabase()
  const orderColumn = kind === 'sizes' ? 'sort_order' : 'name'
  const { data, error } = await client
    .from(kind)
    .select('*')
    .order(orderColumn, { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as RegistryTableMap[K][]
}

export async function createRegistryItem<K extends RegistryKind>(kind: K, input: RegistryInput) {
  const client = getSupabase()
  const payload = toRegistryPayload(kind, input)
  const { data, error } = await client.from(kind).insert(payload as never).select().single()

  if (error) {
    throw new Error(error.message)
  }

  return data as RegistryTableMap[K]
}

export async function updateRegistryItem<K extends RegistryKind>(
  kind: K,
  id: string,
  input: RegistryInput,
) {
  const client = getSupabase()
  const payload = toRegistryPayload(kind, input)
  const { data, error } = await client.from(kind).update(payload as never).eq('id', id).select().single()

  if (error) {
    throw new Error(error.message)
  }

  return data as RegistryTableMap[K]
}

export async function deleteRegistryItem(kind: RegistryKind, id: string) {
  const client = getSupabase()
  const { error } = await client.from(kind).delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function loadProductRegistries() {
  const [brands, clothingTypes, sizes, colors] = await Promise.all([
    listRegistryItems('brands'),
    listRegistryItems('clothing_types'),
    listRegistryItems('sizes'),
    listRegistryItems('colors'),
  ])

  return { brands, clothingTypes, sizes, colors }
}

export interface ProductInput {
  name: string
  barcode?: string | null
  brand_id?: string | null
  clothing_type_id?: string | null
  family?: string | null
  size_id?: string | null
  color_id?: string | null
  reference?: string | null
  cost_price: number
  sale_price: number
  suggested_price?: number | null
  stock_quantity: number
  min_stock: number
  description?: string | null
  active: boolean
}

export interface ProductModelInput {
  reference: string
  name: string
  family?: string | null
  brand_id?: string | null
  category_id?: string | null
}

export interface BarcodeLookupFound {
  kind: 'found'
  code: string
  product: Product
  productModel: ProductModel | null
  sameModelVariants: Product[]
  suggestions: Product[]
}

export interface BarcodeLookupNotFound {
  kind: 'not_found'
  code: string
}

export type BarcodeLookupResult = BarcodeLookupFound | BarcodeLookupNotFound

export interface ProductFilters {
  query?: string
  brandId?: string
  clothingTypeId?: string
  sizeId?: string
  colorId?: string
  active?: boolean | null
  lowStock?: boolean
}

const productModelSelect = `
  id,
  user_id,
  reference,
  name,
  family,
  brand_id,
  category_id,
  created_at,
  updated_at,
  brand:brands(id, name, description, active, created_at, updated_at),
  category:clothing_types(id, name, description, active, created_at, updated_at)
`

const productSelect = `
  *,
  product_model:product_models(${productModelSelect}),
  brand:brands(id, name, description, active, created_at, updated_at),
  clothing_type:clothing_types(id, name, description, active, created_at, updated_at),
  size:sizes(id, name, sort_order, active, created_at, updated_at),
  color:colors(id, name, hex, active, created_at, updated_at)
`

const customerSelect = `
  id,
  user_id,
  name,
  phone,
  email,
  cpf,
  notes,
  created_at,
  updated_at
`

const salePaymentSelect = `
  id,
  sale_id,
  source_kind,
  payment_method,
  amount,
  installments_count,
  installment_value,
  cash_movement_id,
  created_at
`

function isMissingProductSnapshotColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')

  return message.includes('product_snapshot') && message.includes('does not exist')
}

export function buildSaleSelect(includeProductSnapshot = true) {
  return `
    *,
    customer:customers(${customerSelect}),
    sale_items(
      *,
      ${includeProductSnapshot ? 'product_snapshot,' : ''}
      product:products(
        *,
        product_model:product_models(${productModelSelect}),
        brand:brands(id, name, description, active, created_at, updated_at),
        clothing_type:clothing_types(id, name, description, active, created_at, updated_at),
        size:sizes(id, name, sort_order, active, created_at, updated_at),
        color:colors(id, name, hex, active, created_at, updated_at)
      )
    ),
    sale_payments(${salePaymentSelect})
  `
}

export function buildStockMovementSelect(includeProductSnapshot = true) {
  return `
        *,
        ${includeProductSnapshot ? 'product_snapshot,' : ''}
        product:products(
          *,
          product_model:product_models(${productModelSelect}),
          brand:brands(id, name, description, active, created_at, updated_at),
          clothing_type:clothing_types(id, name, description, active, created_at, updated_at),
          size:sizes(id, name, sort_order, active, created_at, updated_at),
          color:colors(id, name, hex, active, created_at, updated_at)
        ),
        sale:sales(${buildSaleSelect(includeProductSnapshot)}),
        cash_movement:cash_movements(id, movement_code, description, amount, movement_date)
      `
}

export async function listProducts(filters: ProductFilters = {}) {
  const client = getSupabase()
  let request = client.from('products').select(productSelect).order('name', { ascending: true })

  if (filters.brandId) {
    request = request.eq('brand_id', filters.brandId)
  }

  if (filters.clothingTypeId) {
    request = request.eq('clothing_type_id', filters.clothingTypeId)
  }

  if (filters.sizeId) {
    request = request.eq('size_id', filters.sizeId)
  }

  if (filters.colorId) {
    request = request.eq('color_id', filters.colorId)
  }

  if (filters.active !== null && filters.active !== undefined) {
    request = request.eq('active', filters.active)
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  let products = ((data ?? []) as Product[]).map(normalizeProduct)
  const query = filters.query?.trim().toLowerCase()

  if (query) {
    products = products.filter((product) =>
      [
        product.name,
        product.barcode,
        product.reference,
        product.brand?.name,
        product.clothing_type?.name,
        product.color?.name,
        product.size?.name,
        product.product_model?.name,
        product.product_model?.reference,
        product.product_model?.family,
        product.product_model?.brand?.name,
        product.product_model?.category?.name,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
    products = products.sort((a, b) => {
      const aExactBarcode = a.barcode?.toLowerCase() === query
      const bExactBarcode = b.barcode?.toLowerCase() === query

      if (aExactBarcode !== bExactBarcode) {
        return aExactBarcode ? -1 : 1
      }

      const aBarcodeMatch = a.barcode?.toLowerCase().includes(query) ?? false
      const bBarcodeMatch = b.barcode?.toLowerCase().includes(query) ?? false

      if (aBarcodeMatch !== bBarcodeMatch) {
        return aBarcodeMatch ? -1 : 1
      }

      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
    })
  }

  if (filters.lowStock) {
    products = products.filter((product) => product.stock_quantity <= product.min_stock)
  }

  return products
}

function buildProductModelPayload(input: ProductInput, user: User | null, existingModel?: ProductModel | null) {
  return {
    user_id: user?.id ?? existingModel?.user_id ?? null,
    reference: normalizeNullable(input.reference) ?? existingModel?.reference ?? null,
    name: input.name.trim(),
    family: normalizeNullable(input.family) ?? existingModel?.family ?? null,
    brand_id: input.brand_id || existingModel?.brand_id || null,
    category_id: input.clothing_type_id || existingModel?.category_id || null,
  }
}

function buildProductVariantPayload(input: ProductInput, model: ProductModel, userId?: string | null) {
  return {
    ...toProductPayload({
      ...input,
      name: model.name,
      barcode: input.barcode,
      brand_id: model.brand_id ?? input.brand_id ?? null,
      clothing_type_id: model.category_id ?? input.clothing_type_id ?? null,
      reference: model.reference || input.reference || null,
      family: input.family ?? model.family ?? null,
    }),
    product_model_id: model.id,
    user_id: userId ?? null,
  }
}

async function loadProductById(id: string, active?: boolean | null) {
  const client = getSupabase()
  let request = client.from('products').select(productSelect).eq('id', id)

  if (active !== null && active !== undefined) {
    request = request.eq('active', active)
  }

  const { data, error } = await request.limit(1).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeProduct(data as Product) : null
}

export async function findProductModelByReference(reference: string) {
  const client = getSupabase()
  const normalized = normalizeNullable(reference)

  if (!normalized) {
    return null
  }

  let request = client.from('product_models').select(productModelSelect).eq('reference', normalized)
  let { data, error } = await request.limit(1).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    request = client.from('product_models').select(productModelSelect).ilike('reference', normalized)
    const response = await request.limit(1).maybeSingle()
    data = response.data
    error = response.error
  }

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeProductModel(data as unknown as ProductModel) : null
}

export async function findVariantByBarcode(code: string, active = false) {
  const client = getSupabase()
  const normalized = normalizeBarcode(code)

  if (!normalized) {
    return null
  }

  let request = client.from('products').select(productSelect).eq('barcode', normalized)

  if (active) {
    request = request.eq('active', true)
  }

  const { data, error } = await request.limit(1).maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeProduct(data as Product) : null
}

export async function findProductByBarcode(code: string, active = true) {
  return findVariantByBarcode(code, active)
}

export async function findVariantsByReference(reference: string, active?: boolean | null) {
  const model = await findProductModelByReference(reference)

  if (!model) {
    return []
  }

  const products = await listProducts({ active: active ?? null })
  return products.filter((product) => sameProductModel(product, model))
}

export async function findVariantsByProductId(productId: string, active?: boolean | null) {
  const product = await loadProductById(productId, active)

  if (!product) {
    return []
  }

  if (!product.product_model_id && !product.reference) {
    return [product]
  }

  if (product.product_model_id) {
    const products = await listProducts({ active: active ?? null })
    return products.filter((candidate) => candidate.product_model_id === product.product_model_id)
  }

  return findVariantsByReference(product.reference ?? '', active)
}

export async function findSuggestionsByFamily(family: string, currentProductId?: string) {
  const normalizedFamily = normalizeNullable(family)

  if (!normalizedFamily) {
    return []
  }

  const products = await listProducts({ active: true })
  const currentProduct = currentProductId ? await loadProductById(currentProductId, false) : null
  const currentModelId = currentProduct?.product_model_id ?? null
  const normalizedCurrentName = normalizeText(currentProduct?.product_model?.name ?? currentProduct?.name ?? '')

  return products
    .filter((product) => product.stock_quantity > 0)
    .filter((product) => product.id !== currentProductId)
    .filter((product) => product.product_model_id !== currentModelId)
    .filter((product) => {
      const candidateFamily = normalizeText(product.product_model?.family ?? '')
      return candidateFamily === normalizeText(normalizedFamily) || candidateFamily.includes(normalizeText(normalizedFamily))
    })
    .sort((a, b) => compareSuggestedProducts(a, b, normalizedCurrentName))
}

export async function findBarcodeLookup(code: string) {
  const product = await findVariantByBarcode(code, false)

  if (!product) {
    return {
      kind: 'not_found' as const,
      code: normalizeBarcode(code),
    }
  }

  const sameModelVariants = await findVariantsByProductId(product.id, false)
  const model = product.product_model ?? (product.reference ? await findProductModelByReference(product.reference) : null)
  const hasSameModelStock = sameModelVariants.some((variant) => variant.stock_quantity > 0)
  const suggestions = hasSameModelStock || !model?.family ? [] : await findSuggestionsByFamily(model.family, product.id)

  return {
    kind: 'found' as const,
    code: normalizeBarcode(code),
    product,
    productModel: model,
    sameModelVariants,
    suggestions,
  }
}

export async function findBarcodeLookupByProductId(productId: string) {
  const product = await loadProductById(productId, false)

  if (!product) {
    return null
  }

  const code = normalizeBarcode(product.barcode ?? product.reference ?? product.product_model?.reference ?? '')
  const sameModelVariants = await findVariantsByProductId(product.id, false)
  const model = product.product_model ?? (product.reference ? await findProductModelByReference(product.reference) : null)
  const hasSameModelStock = sameModelVariants.some((variant) => variant.stock_quantity > 0)
  const suggestions = hasSameModelStock || !model?.family ? [] : await findSuggestionsByFamily(model.family, product.id)

  return {
    kind: 'found' as const,
    code,
    product,
    productModel: model,
    sameModelVariants,
    suggestions,
  }
}

export async function createProductModelIfNeeded(input: ProductInput, user: User | null) {
  const client = getSupabase()
  const reference = normalizeNullable(input.reference)
  const existingModel = reference ? await findProductModelByReference(reference) : null
  const payload = buildProductModelPayload(input, user, existingModel)

  if (existingModel) {
    const { data, error } = await client
      .from('product_models')
      .update(payload as never)
      .eq('id', existingModel.id)
      .select(productModelSelect)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    const model = normalizeProductModel(data as unknown as ProductModel)
    await syncProductsForModel(model)
    return model
  }

  const { data, error } = await client.from('product_models').insert(payload as never).select(productModelSelect).single()

  if (error) {
    throw new Error(error.message)
  }

  const model = normalizeProductModel(data as unknown as ProductModel)
  await syncProductsForModel(model)
  return model
}

export async function createProductVariant(input: ProductInput, user: User | null, existingProductId?: string) {
  const client = getSupabase()
  const existingProduct = existingProductId ? await loadProductById(existingProductId, null) : null

  let model: ProductModel
  if (existingProduct?.product_model_id) {
    model = await updateProductModelById(existingProduct.product_model_id, input, user)
  } else {
    model = await createProductModelIfNeeded(input, user)
  }

  const payload = buildProductVariantPayload(input, model, user?.id ?? existingProduct?.user_id ?? null)

  if (existingProductId) {
    const { data, error } = await client
      .from('products')
      .update(payload as never)
      .eq('id', existingProductId)
      .select(productSelect)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return normalizeProduct(data as Product)
  }

  const { data, error } = await client.from('products').insert(payload as never).select(productSelect).single()

  if (error) {
    throw new Error(error.message)
  }

  const product = normalizeProduct(data as Product)

  if (product.stock_quantity > 0) {
    await createStockMovement({
      productId: product.id,
      type: 'entrada',
      reason: 'cadastro_inicial',
      quantity: product.stock_quantity,
      notes: 'Quantidade inicial informada no cadastro do produto.',
      user,
      applyStockUpdate: false,
    })
  }

  return product
}

export async function createProduct(input: ProductInput, user: User | null) {
  return createProductVariant(input, user)
}

export async function updateProduct(id: string, input: ProductInput) {
  return createProductVariant(input, null, id)
}

// Mantido por compatibilidade com chamadas antigas; agora a ação é exclusão real.
export async function archiveProduct(id: string, confirmationPin?: string) {
  return deleteProduct(id, confirmationPin ?? '')
}

export interface ProductDeleteImpact {
  sale_items_count: number
  stock_movements_count: number
  total_related_count: number
}

export async function getProductDeleteImpact(productId: string): Promise<ProductDeleteImpact> {
  const client = getSupabase()
  const [saleItemsResponse, stockMovementsResponse] = await Promise.all([
    client.from('sale_items').select('id', { count: 'exact', head: true }).eq('product_id', productId),
    client.from('stock_movements').select('id', { count: 'exact', head: true }).eq('product_id', productId),
  ])

  if (saleItemsResponse.error) {
    throw new Error(saleItemsResponse.error.message)
  }

  if (stockMovementsResponse.error) {
    throw new Error(stockMovementsResponse.error.message)
  }

  const saleItemsCount = saleItemsResponse.count ?? 0
  const stockMovementsCount = stockMovementsResponse.count ?? 0

  return {
    sale_items_count: saleItemsCount,
    stock_movements_count: stockMovementsCount,
    total_related_count: saleItemsCount + stockMovementsCount,
  }
}

export async function deleteProduct(id: string, confirmationPin: string) {
  const client = getSupabase()
  const pin = confirmationPin.trim()

  if (!pin) {
    throw new Error('Confirme a exclusão com o PIN de administrador.')
  }

  const { error } = await client.rpc('admin_delete_product_with_pin', {
    p_product_id: id,
    p_pin: pin,
    p_user_id: null,
  } as never)

  if (error) {
    throw new Error(error.message)
  }

}

export async function findProductForSale(query: string) {
  const exact = await findProductByBarcode(query, true)
  if (exact) {
    return exact
  }

  const products = await listProducts({ query: query.trim(), active: true })
  const normalized = normalizeText(query)

  return products.find((product) => normalizeText(product.name) === normalized) ?? products[0] ?? null
}

interface StockMovementInput {
  productId: string
  type: StockMovementType
  reason: StockMovementReason
  quantity: number
  notes?: string | null
  user?: User | null
  applyStockUpdate?: boolean
}

export async function createStockMovement({
  productId,
  type,
  reason,
  quantity,
  notes,
  user,
  applyStockUpdate = true,
}: StockMovementInput) {
  const client = getSupabase()
  const { data: product, error: productError } = await client
    .from('products')
    .select(productSelect)
    .eq('id', productId)
    .single()

  if (productError) {
    throw new Error(productError.message)
  }

  const normalizedProduct = normalizeProduct(product as Product)

  if (applyStockUpdate) {
    const currentStock = Number(normalizedProduct.stock_quantity ?? 0)
    const nextStock = type === 'entrada' ? currentStock + quantity : currentStock - quantity

    if (nextStock < 0) {
      throw new Error('Quantidade maior que o estoque disponível.')
    }

    const { error: updateError } = await client
      .from('products')
      .update({ stock_quantity: nextStock })
      .eq('id', productId)

    if (updateError) {
      throw new Error(updateError.message)
    }
  }

  const { error } = await client.from('stock_movements').insert({
    user_id: user?.id ?? null,
    product_id: productId,
    product_snapshot: buildProductSnapshot(normalizedProduct),
    type,
    reason,
    quantity,
    notes: normalizeNullable(notes),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function listStockMovements() {
  const client = getSupabase()
  for (const includeProductSnapshot of [true, false] as const) {
    const { data, error } = await client
      .from('stock_movements')
      .select(buildStockMovementSelect(includeProductSnapshot))
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      if (includeProductSnapshot && isMissingProductSnapshotColumnError(error)) {
        continue
      }

      throw new Error(error.message)
    }

    return ((data ?? []) as unknown as StockMovement[]).map(normalizeStockMovement)
  }

  return []
}

export interface SaleLineInput {
  product: Product
  quantity: number
  unitPrice: number
  pricingKind?: SalePricingKind
  originalUnitPrice?: number
  installmentsCount?: number
  installmentValue?: number
}

export interface SalePaymentInput {
  sourceKind: SalePaymentSourceKind
  paymentMethod: PaymentMethod
  amount: number
  installmentsCount?: number
  installmentValue?: number
}

export interface CashExpenseInput {
  description: string
  amount: number
  movementDate: string
  paymentMethod: PaymentMethod
  notes?: string | null
  user?: User | null
  cashSessionId?: string | null
  confirmationPin?: string
}

export interface CashIncomeInput {
  description: string
  amount: number
  movementDate: string
  paymentMethod: PaymentMethod
  notes?: string | null
  user?: User | null
  cashSessionId?: string | null
  confirmationPin?: string
}

export interface SaleRegistrationInput {
  items: SaleLineInput[]
  payments?: SalePaymentInput[]
  paymentMethod?: PaymentMethod
  installmentsCount?: number
  customerId?: string | null
  movementDate: string
  notes?: string | null
  user?: User | null
  cashSessionId?: string | null
  confirmationPin?: string
}

export interface CustomerInput {
  name: string
  phone?: string | null
  email?: string | null
  cpf?: string | null
  notes?: string | null
  user?: User | null
}

export interface OpenCashSessionInput {
  openingAmount: number
  notes?: string | null
  user?: User | null
  confirmationPin?: string
}

export interface CloseCashSessionInput {
  sessionId: string
  closingAmount: number
  expectedAmount: number
  differenceAmount: number
  notes?: string | null
  user?: User | null
  confirmationPin?: string
}

export interface CashMovementFilters {
  type?: CashMovementType | 'all'
  description?: string
  minAmount?: number | null
  maxAmount?: number | null
  startDate?: string
  endDate?: string
  paymentMethod?: PaymentMethod | 'all'
  page?: number
  pageSize?: number
}

export interface CashMovementSearchResult {
  data: CashMovement[]
  count: number
  page: number
  pageSize: number
}

export interface CashHistoryFilters extends Omit<CashMovementFilters, 'type'> {
  type?: CashMovementFilters['type'] | 'session_open' | 'session_close'
}

export interface CashHistorySearchResult {
  data: CashHistoryEntry[]
  count: number
  page: number
  pageSize: number
}

export interface CustomerSalesSearchResult {
  data: Sale[]
  count: number
  page: number
  pageSize: number
}

function buildCashMovementSelect(includeProductSnapshot = true) {
  return `
    *,
    sale:sales(${buildSaleSelect(includeProductSnapshot)}),
    sale_payment:sale_payments!cash_movements_sale_payment_id_fkey(${salePaymentSelect})
  `
}

async function executeWithProductSnapshotFallback(
  executor: (includeProductSnapshot: boolean) => unknown,
) {
  for (const includeProductSnapshot of [true, false] as const) {
    const response = (await executor(includeProductSnapshot)) as {
      error?: { message: string } | null
      data?: unknown
      count?: number | null
    }

    if (response.error) {
      if (includeProductSnapshot && isMissingProductSnapshotColumnError(response.error)) {
        continue
      }

      throw new Error(response.error.message)
    }

    return response
  }

  return null
}

function normalizeCashSession(session: CashSession): CashSession {
  return {
    ...session,
    opening_amount: normalizeNumber(session.opening_amount),
    closing_amount: session.closing_amount === null || session.closing_amount === undefined ? null : Number(session.closing_amount),
    expected_amount: session.expected_amount === null || session.expected_amount === undefined ? null : Number(session.expected_amount),
    difference_amount: session.difference_amount === null || session.difference_amount === undefined ? null : Number(session.difference_amount),
  }
}

function normalizeCashHistoryMovement(movement: CashMovement): CashHistoryMovement {
  return {
    ...normalizeCashMovement(movement),
    kind: 'movement',
  }
}

function buildCashSessionHistoryEvent(session: CashSession, eventType: 'open' | 'close'): CashSessionHistoryEvent {
  const timestamp = eventType === 'open' ? session.opened_at : session.closed_at ?? session.opened_at
  const amount = eventType === 'open' ? session.opening_amount : session.closing_amount ?? session.expected_amount ?? 0
  const shortId = session.id.slice(0, 8).toUpperCase()

  return {
    kind: 'session',
    eventType,
    session,
    id: `session-${eventType}-${session.id}`,
    movement_code: `${eventType === 'open' ? 'ABR' : 'FEC'}-${shortId}`,
    type: 'session',
    origin: eventType === 'open' ? 'session_open' : 'session_close',
    description: eventType === 'open' ? 'Abertura de caixa' : 'Fechamento de caixa',
    amount: normalizeNumber(amount),
    movement_date:
      eventType === 'open'
        ? session.session_date
        : (session.closed_at?.split('T')[0] ?? session.session_date),
    payment_method: null,
    notes: session.notes ?? null,
    created_at: timestamp,
    updated_at: session.updated_at,
    sale: null,
  }
}

function sortCashHistoryEntries(a: CashHistoryEntry, b: CashHistoryEntry) {
  return b.created_at.localeCompare(a.created_at)
}

function normalizeMonthBounds(date = todayISODate()) {
  const current = new Date(`${date}T00:00:00`)
  const start = new Date(current.getFullYear(), current.getMonth(), 1)
  const end = new Date(current.getFullYear(), current.getMonth() + 1, 1)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export async function listCustomers() {
  const client = getSupabase()
  const { data, error } = await client
    .from('customers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Customer[]
}

export async function getCashMovementBySaleId(saleId: string) {
  const client = getSupabase()
  const movementResponse = await executeWithProductSnapshotFallback((includeProductSnapshot) =>
    client
      .from('cash_movements')
      .select(buildCashMovementSelect(includeProductSnapshot))
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  )

  if (movementResponse?.data) {
    return normalizeCashHistoryMovement(movementResponse.data as CashMovement)
  }

  for (const includeProductSnapshot of [true, false] as const) {
    const saleResponse = await client
      .from('sales')
      .select(buildSaleSelect(includeProductSnapshot))
      .eq('id', saleId)
      .maybeSingle()

    if (saleResponse.error) {
      if (includeProductSnapshot && isMissingProductSnapshotColumnError(saleResponse.error)) {
        continue
      }

      throw new Error(saleResponse.error.message)
    }

    return saleResponse.data ? buildCashHistoryMovementFromSale(saleResponse.data as unknown as Sale) : null
  }

  return null
}

export async function listSalesByCustomer(customerId: string, page = 1, pageSize = 5): Promise<CustomerSalesSearchResult> {
  const client = getSupabase()
  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = Math.max(1, Math.floor(pageSize))
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1

  for (const includeProductSnapshot of [true, false] as const) {
    const { data, error, count } = await client
      .from('sales')
      .select(buildSaleSelect(includeProductSnapshot), { count: 'exact' })
      .eq('customer_id', customerId)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      if (includeProductSnapshot && isMissingProductSnapshotColumnError(error)) {
        continue
      }

      throw new Error(error.message)
    }

    return {
      data: ((data ?? []) as unknown as Sale[]).map(normalizeSaleWithRelations),
      count: count ?? 0,
      page: safePage,
      pageSize: safePageSize,
    }
  }

  return {
    data: [],
    count: 0,
    page: safePage,
    pageSize: safePageSize,
  }
}

export async function searchCustomers(query: string) {
  const term = query.trim()

  if (!term) {
    return listCustomers()
  }

  const digits = term.replace(/\D/g, '')
  const normalized = normalizeText(term)
  const customers = await listCustomers()

  return customers.filter((customer) => {
    const searchable = [
      customer.name,
      customer.phone,
      customer.cpf,
    ]
      .filter(Boolean)
      .map((value) => value ?? '')

    return searchable.some((value) => {
      const text = normalizeText(value)
      return (
        text.includes(normalized) ||
        (digits.length > 0 && value.replace(/\D/g, '').includes(digits))
      )
    })
  })
}

export async function createCustomer(input: CustomerInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('customers')
    .insert({
      user_id: input.user?.id ?? null,
      name: input.name.trim(),
      phone: normalizeNullable(input.phone),
      email: normalizeNullable(input.email),
      cpf: normalizeNullable(input.cpf),
      notes: normalizeNullable(input.notes),
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Customer
}

export async function updateCustomer(id: string, input: CustomerInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('customers')
    .update({
      name: input.name.trim(),
      phone: normalizeNullable(input.phone),
      email: normalizeNullable(input.email),
      cpf: normalizeNullable(input.cpf),
      notes: normalizeNullable(input.notes),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Customer
}

export async function deleteCustomer(id: string) {
  const client = getSupabase()
  const { error } = await client.from('customers').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getTodayCashSession(date = todayISODate()) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_sessions')
    .select('*')
    .eq('session_date', date)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeCashSession(data as CashSession) : null
}

export async function getOpenCashSession(date = todayISODate()) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_sessions')
    .select('*')
    .eq('status', 'open')
    .eq('session_date', date)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeCashSession(data as CashSession) : null
}

export async function getPreviousOpenCashSession(date = todayISODate()) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_sessions')
    .select('*')
    .eq('status', 'open')
    .lt('session_date', date)
    .order('session_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeCashSession(data as CashSession) : null
}

export async function getLastClosedCashSession() {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_sessions')
    .select('*')
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data ? normalizeCashSession(data as CashSession) : null
}

export async function openCashSession(input: OpenCashSessionInput) {
  const client = getSupabase()
  const confirmationPin = input.confirmationPin?.trim()
  if (!confirmationPin) {
    throw new Error('Confirme a operação com o PIN antes de abrir o caixa.')
  }

  const existingOpenSession = await client
    .from('cash_sessions')
    .select('id, session_date, opened_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingOpenSession.error) {
    throw new Error(existingOpenSession.error.message)
  }

  if (existingOpenSession.data) {
    const sessionDate = (existingOpenSession.data as { session_date?: string | null }).session_date
    throw new Error(
      sessionDate
        ? `Já existe um caixa aberto em ${formatDateBR(sessionDate)}. Feche-o antes de abrir outro.`
        : 'Já existe um caixa aberto. Feche-o antes de abrir outro.',
    )
  }

  const { data, error } = await client.rpc('open_cash_session_with_pin', {
    p_opening_amount: input.openingAmount,
    p_notes: normalizeNullable(input.notes),
    p_pin: confirmationPin,
    p_user_id: input.user?.id ?? null,
  } as never)

  if (error) {
    throw new Error(error.message)
  }

  const sessionId = (data as { session_id?: string } | null)?.session_id
  if (!sessionId) {
    throw new Error('Não foi possível abrir o caixa.')
  }

  const sessionResponse = await client.from('cash_sessions').select('*').eq('id', sessionId).single()
  if (sessionResponse.error) {
    throw new Error(sessionResponse.error.message)
  }

  return normalizeCashSession(sessionResponse.data as CashSession)
}

export async function closeCashSession(input: CloseCashSessionInput) {
  const client = getSupabase()
  const sessionId = requireUuid(input.sessionId)
  const confirmationPin = input.confirmationPin?.trim()
  if (!confirmationPin) {
    throw new Error('Confirme a operação com o PIN antes de fechar o caixa.')
  }

  const { data, error } = await client.rpc('close_cash_session_with_pin', {
    p_session_id: sessionId,
    p_closing_amount: input.closingAmount,
    p_expected_amount: input.expectedAmount,
    p_difference_amount: input.differenceAmount,
    p_notes: normalizeNullable(input.notes),
    p_pin: confirmationPin,
    p_user_id: input.user?.id ?? null,
  } as never)

  if (error) {
    throw new Error(error.message)
  }

  const returnedSessionId = (data as { session_id?: string } | null)?.session_id ?? sessionId
  const sessionResponse = await client.from('cash_sessions').select('*').eq('id', returnedSessionId).single()
  if (sessionResponse.error) {
    throw new Error(sessionResponse.error.message)
  }

  return normalizeCashSession(sessionResponse.data as CashSession)
}

export async function listTodayCashMovements(date = todayISODate()) {
  const client = getSupabase()
  const response = await executeWithProductSnapshotFallback((includeProductSnapshot) =>
    client
      .from('cash_movements')
      .select(buildCashMovementSelect(includeProductSnapshot))
      .eq('movement_date', date)
      .order('created_at', { ascending: false }),
  )

  if (!response) {
    return []
  }

  return ((response.data ?? []) as CashMovement[]).map(normalizeCashMovement)
}

export async function listCashMovementsForSession(sessionId: string, openedAt: string) {
  const client = getSupabase()
  const response = await executeWithProductSnapshotFallback((includeProductSnapshot) =>
    client
      .from('cash_movements')
      .select(buildCashMovementSelect(includeProductSnapshot))
      .eq('cash_session_id', sessionId)
      .gte('created_at', openedAt)
      .order('created_at', { ascending: false }),
  )

  if (!response) {
    return []
  }

  return ((response.data ?? []) as CashMovement[]).map(normalizeCashMovement)
}

export async function listCashSessionHistoryEvents(date = todayISODate()) {
  const client = getSupabase()
  const nextDate = new Date(`${date}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + 1)
  const nextDateISO = nextDate.toISOString().slice(0, 10)

  const [openedResponse, closedResponse] = await Promise.all([
    client.from('cash_sessions').select('*').eq('session_date', date).order('opened_at', { ascending: false }),
    client
      .from('cash_sessions')
      .select('*')
      .gte('closed_at', `${date}T00:00:00`)
      .lt('closed_at', `${nextDateISO}T00:00:00`)
      .order('closed_at', { ascending: false }),
  ])

  if (openedResponse.error) {
    throw new Error(openedResponse.error.message)
  }

  if (closedResponse.error) {
    throw new Error(closedResponse.error.message)
  }

  const openedEvents = ((openedResponse.data ?? []) as CashSession[]).map((session) =>
    buildCashSessionHistoryEvent(normalizeCashSession(session), 'open'),
  )
  const closedEvents = ((closedResponse.data ?? []) as CashSession[]).map((session) =>
    buildCashSessionHistoryEvent(normalizeCashSession(session), 'close'),
  )

  return [...openedEvents, ...closedEvents].sort(sortCashHistoryEntries)
}

export async function listTodayCashHistory(date = todayISODate()) {
  const [movements, sessionEvents] = await Promise.all([listTodayCashMovements(date), listCashSessionHistoryEvents(date)])
  return [...movements.map((movement) => ({ ...movement, kind: 'movement' as const })), ...sessionEvents].sort(sortCashHistoryEntries)
}

export async function searchCashMovements(filters: CashMovementFilters): Promise<CashMovementSearchResult> {
  const client = getSupabase()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const movementType = filters.type === 'income' || filters.type === 'expense' ? filters.type : 'all'

  const response = await executeWithProductSnapshotFallback((includeProductSnapshot) => {
    let request = client
      .from('cash_movements')
      .select(buildCashMovementSelect(includeProductSnapshot), { count: 'exact' })
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (movementType !== 'all') {
      request = request.eq('type', movementType)
    }

    if (filters.description?.trim()) {
      request = request.ilike('description', `%${filters.description.trim()}%`)
    }

    if (filters.minAmount !== null && filters.minAmount !== undefined) {
      request = request.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
      request = request.lte('amount', filters.maxAmount)
    }

    if (filters.startDate) {
      request = request.gte('movement_date', filters.startDate)
    }

    if (filters.endDate) {
      request = request.lte('movement_date', filters.endDate)
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      request = request.eq('payment_method', filters.paymentMethod)
    }

    return request
  })

  if (!response) {
    return {
      data: [],
      count: 0,
      page,
      pageSize,
    }
  }

  return {
    data: ((response.data ?? []) as CashMovement[]).map(normalizeCashMovement),
    count: response.count ?? 0,
    page,
    pageSize,
  }
}

async function listCashMovementsForHistory(filters: CashHistoryFilters) {
  if (filters.type === 'session_open' || filters.type === 'session_close') {
    return []
  }

  const client = getSupabase()
  const movementType = filters.type === 'income' || filters.type === 'expense' ? filters.type : 'all'

  const response = await executeWithProductSnapshotFallback((includeProductSnapshot) => {
    let request = client
      .from('cash_movements')
      .select(buildCashMovementSelect(includeProductSnapshot))
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (movementType !== 'all') {
      request = request.eq('type', movementType)
    }

    if (filters.description?.trim()) {
      request = request.ilike('description', `%${filters.description.trim()}%`)
    }

    if (filters.minAmount !== null && filters.minAmount !== undefined) {
      request = request.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount !== null && filters.maxAmount !== undefined) {
      request = request.lte('amount', filters.maxAmount)
    }

    if (filters.startDate) {
      request = request.gte('movement_date', filters.startDate)
    }

    if (filters.endDate) {
      request = request.lte('movement_date', filters.endDate)
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      request = request.eq('payment_method', filters.paymentMethod)
    }

    return request
  })

  if (!response) {
    return []
  }

  return ((response.data ?? []) as CashMovement[]).map(normalizeCashHistoryMovement)
}

async function listCashSessionHistoryEventsForSearch(filters: CashHistoryFilters) {
  const client = getSupabase()
  const { data, error } = await client.from('cash_sessions').select('*').order('session_date', { ascending: false }).order('opened_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const entries = ((data ?? []) as CashSession[])
    .map((session) => normalizeCashSession(session))
    .flatMap((session) => {
      const openEvent = buildCashSessionHistoryEvent(session, 'open')
      const closeEvent = session.closed_at ? [buildCashSessionHistoryEvent(session, 'close')] : []
      return [openEvent, ...closeEvent]
    })
    .filter((event) => {
      const description = normalizeText(`${event.description} ${event.notes ?? ''}`)

      if (filters.description?.trim() && !description.includes(normalizeText(filters.description))) {
        return false
      }

      if (filters.minAmount !== null && filters.minAmount !== undefined && event.amount < filters.minAmount) {
        return false
      }

      if (filters.maxAmount !== null && filters.maxAmount !== undefined && event.amount > filters.maxAmount) {
        return false
      }

      if (filters.startDate && event.movement_date < filters.startDate) {
        return false
      }

      if (filters.endDate && event.movement_date > filters.endDate) {
        return false
      }

      return true
    })

  return entries
}

export async function searchCashHistory(filters: CashHistoryFilters): Promise<CashHistorySearchResult> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 25
  const typeFilter = filters.type ?? 'all'

  const [movementEntries, sessionEvents] = await Promise.all([
    listCashMovementsForHistory(filters),
    listCashSessionHistoryEventsForSearch(filters),
  ])

  const filteredMovementEntries =
    typeFilter === 'session_open' || typeFilter === 'session_close'
      ? []
      : movementEntries

  const filteredSessionItems = sessionEvents.filter((event) => {
    if (typeFilter === 'session_open') {
      return event.eventType === 'open'
    }

    if (typeFilter === 'session_close') {
      return event.eventType === 'close'
    }

    return typeFilter === 'all'
  })

  const data = [...filteredMovementEntries, ...filteredSessionItems].sort(sortCashHistoryEntries)
  const from = (page - 1) * pageSize
  const pageData = data.slice(from, from + pageSize)

  return {
    data: pageData,
    count: data.length,
    page,
    pageSize,
  }
}

export async function getSalesTotal(startDate?: string | null, endDate?: string | null) {
  const client = getSupabase()
  const { data, error } = await client.rpc('get_sales_total', {
    p_start_date: startDate ?? null,
    p_end_date: endDate ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return normalizeNumber(data)
}

export async function getCashExpenseTotal(startDate?: string | null, endDate?: string | null) {
  const client = getSupabase()
  const { data, error } = await client.rpc('get_cash_expense_total', {
    p_start_date: startDate ?? null,
    p_end_date: endDate ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  return normalizeNumber(data)
}

export async function getMonthSalesTotal(date = todayISODate()) {
  const { startDate, endDate } = normalizeMonthBounds(date)
  return getSalesTotal(startDate, endDate)
}

export async function getTodaySalesTotal(date = todayISODate()) {
  const current = new Date(`${date}T00:00:00`)
  const next = new Date(current)
  next.setDate(current.getDate() + 1)

  return getSalesTotal(date, next.toISOString().slice(0, 10))
}

export async function getAllTimeSalesTotal() {
  return getSalesTotal()
}

export async function getAllTimeCashExpenseTotal() {
  return getCashExpenseTotal()
}

export async function createCashExpense(input: CashExpenseInput) {
  const sessionId = requireUuid(input.cashSessionId)
  const client = getSupabase()
  const confirmationPin = input.confirmationPin?.trim()
  if (!confirmationPin) {
    throw new Error('Confirme a operação com o PIN antes de registrar a despesa.')
  }

  const { data, error } = await client
    .rpc('register_cash_expense_with_pin', {
      p_cash_session_id: sessionId,
      p_description: input.description.trim(),
      p_amount: Math.abs(input.amount),
      p_movement_date: input.movementDate,
      p_payment_method: input.paymentMethod,
      p_notes: normalizeNullable(input.notes),
      p_pin: confirmationPin,
      p_user_id: null,
    } as never)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const movementId = (data as { cash_movement_id?: string } | null)?.cash_movement_id
  if (!movementId) {
    throw new Error('Não foi possível registrar a despesa.')
  }

  const movementResponse = await executeWithProductSnapshotFallback((includeProductSnapshot) =>
    client
      .from('cash_movements')
      .select(buildCashMovementSelect(includeProductSnapshot))
      .eq('id', movementId)
      .single(),
  )

  if (!movementResponse?.data) {
    throw new Error('Não foi possível registrar a despesa.')
  }

  return normalizeCashMovement(movementResponse.data as CashMovement)
}

export async function createCashIncome(input: CashIncomeInput) {
  const sessionId = requireUuid(input.cashSessionId)
  const client = getSupabase()
  const confirmationPin = input.confirmationPin?.trim()
  if (!confirmationPin) {
    throw new Error('Confirme a operação com o PIN antes de registrar a entrada.')
  }

  const { data, error } = await client
    .rpc('register_cash_income_with_pin', {
      p_cash_session_id: sessionId,
      p_description: input.description.trim(),
      p_amount: Math.abs(input.amount),
      p_movement_date: input.movementDate,
      p_payment_method: input.paymentMethod,
      p_notes: normalizeNullable(input.notes),
      p_pin: confirmationPin,
      p_user_id: null,
    } as never)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const movementId = (data as { cash_movement_id?: string } | null)?.cash_movement_id
  if (!movementId) {
    throw new Error('Não foi possível registrar a entrada.')
  }

  const movementResponse = await executeWithProductSnapshotFallback((includeProductSnapshot) =>
    client
      .from('cash_movements')
      .select(buildCashMovementSelect(includeProductSnapshot))
      .eq('id', movementId)
      .single(),
  )

  if (!movementResponse?.data) {
    throw new Error('Não foi possível registrar a entrada.')
  }

  return normalizeCashMovement(movementResponse.data as CashMovement)
}

export async function registerSaleWithCashAndStock(input: SaleRegistrationInput) {
  if (input.items.length === 0) {
    throw new Error('Adicione pelo menos um item para registrar a venda.')
  }

  const sessionId = requireUuid(input.cashSessionId)
  const confirmationPin = input.confirmationPin?.trim()
  if (!confirmationPin) {
    throw new Error('Confirme a operação com o PIN antes de finalizar a venda.')
  }

  const client = getSupabase()
  const rpcItems = input.items.map((item) => {
    const pricingKind = item.pricingKind ?? 'cash'
    const quantity = Math.max(1, item.quantity)
    const unitPrice = roundCurrency(item.unitPrice)
    const lineTotal = roundCurrency(quantity * unitPrice)
    const installmentsCount = pricingKind === 'installment' ? Math.max(2, item.installmentsCount ?? 2) : 1

    return {
      product_id: item.product.id,
      quantity,
      unit_price: unitPrice,
      pricing_kind: pricingKind,
      original_unit_price: roundCurrency(item.originalUnitPrice ?? unitPrice),
      installments_count: installmentsCount,
      installment_value: roundCurrency(item.installmentValue ?? lineTotal / Math.max(1, installmentsCount)),
    }
  })

  const saleTotal = roundCurrency(rpcItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0))

  const fallbackPayments =
    input.paymentMethod && !input.payments?.length
      ? [
          {
            sourceKind: 'cash_total' as const,
            paymentMethod: input.paymentMethod,
            amount: saleTotal,
            installmentsCount: input.installmentsCount ?? 1,
            installmentValue: roundCurrency(saleTotal / Math.max(1, input.installmentsCount ?? 1)),
          },
        ]
      : []

  const normalizedPayments = [...(input.payments ?? []), ...fallbackPayments].map((payment) => {
    const amount = roundCurrency(payment.amount)
    const installmentsCount = Math.max(1, payment.installmentsCount ?? 1)
    const installmentValue = roundCurrency(payment.installmentValue ?? amount / Math.max(1, installmentsCount))

    return {
      source_kind: payment.sourceKind ?? 'cash_total',
      payment_method: payment.paymentMethod,
      amount,
      installments_count: installmentsCount,
      installment_value: installmentValue,
    }
  })

  if (normalizedPayments.length === 0) {
    throw new Error('Informe ao menos uma forma de recebimento.')
  }

  const paymentsTotal = roundCurrency(normalizedPayments.reduce((sum, payment) => sum + payment.amount, 0))

  if (Math.abs(paymentsTotal - saleTotal) > 0.01) {
    throw new Error('A soma dos recebimentos deve ser igual ao total da venda.')
  }

  if (normalizedPayments.some((payment) => payment.amount <= 0)) {
    throw new Error('Informe valores válidos para os recebimentos.')
  }

  if (
    normalizedPayments.some(
      (payment) => payment.source_kind === 'installment_group' && (payment.payment_method !== 'cartao_credito' || payment.installments_count < 2),
    )
  ) {
    throw new Error('Os itens parcelados precisam ser recebidos no crédito parcelado.')
  }

  const summaryPaymentMethod =
    normalizedPayments.length === 1
      ? normalizedPayments[0].payment_method
      : normalizedPayments.every(
          (payment) =>
            payment.payment_method === normalizedPayments[0].payment_method &&
            payment.installments_count === normalizedPayments[0].installments_count,
        )
        ? normalizedPayments[0].payment_method
        : 'outro'

  const summaryInstallments = Math.max(...normalizedPayments.map((payment) => payment.installments_count))

  const { data, error } = await client.rpc('register_sale_with_cash_and_stock', {
    p_customer_id: input.customerId ?? null,
    p_items: rpcItems,
    p_payments: normalizedPayments,
    p_payment_method: summaryPaymentMethod,
    p_installments_count: summaryInstallments,
    p_movement_date: input.movementDate,
    p_notes: normalizeNullable(input.notes),
    p_user_id: null,
    p_cash_session_id: sessionId,
    p_confirmation_pin: confirmationPin,
  } as never)

  if (error) {
    throw new Error(error.message)
  }

  return data as { sale_id: string; cash_movement_id: string | null; movement_code: string | null }
}

export async function finalizeSale(
  items: SaleLineInput[],
  paymentMethod: PaymentMethod,
  user: User | null,
  confirmationPin: string,
) {
  await registerSaleWithCashAndStock({
    items,
    paymentMethod,
    movementDate: todayISODate(),
    user,
    confirmationPin,
  })
}

export function friendlyCatalogError(error: unknown) {
  const message = getMessage(error)

  if (message.includes('duplicate key')) {
    return 'Já existe um registro com essa informação única.'
  }

  if (message.includes('violates foreign key constraint')) {
    return 'Este registro está relacionado a outros dados e não pode ser removido.'
  }

  return message
}

function toRegistryPayload(kind: RegistryKind, input: RegistryInput) {
  const common = {
    name: input.name.trim(),
    active: input.active ?? true,
  }

  if (kind === 'sizes') {
    return {
      ...common,
      sort_order: input.sort_order ?? null,
    }
  }

  if (kind === 'colors') {
    return {
      ...common,
      hex: normalizeNullable(input.hex),
    }
  }

  return {
    ...common,
    description: normalizeNullable(input.description),
  }
}

function toProductPayload(input: ProductInput) {
  return {
    name: input.name.trim(),
    barcode: normalizeNullable(input.barcode),
    brand_id: input.brand_id || null,
    clothing_type_id: input.clothing_type_id || null,
    size_id: input.size_id || null,
    color_id: input.color_id || null,
    reference: normalizeNullable(input.reference),
    cost_price: input.cost_price,
    sale_price: input.sale_price,
    suggested_price: input.suggested_price ?? 0,
    stock_quantity: input.stock_quantity,
    min_stock: input.min_stock,
    description: normalizeNullable(input.description),
    active: input.active,
  }
}

export function registryItemLabel(item: RegistryItem) {
  return item.name
}
