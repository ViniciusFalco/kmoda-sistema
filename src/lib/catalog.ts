import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  Brand,
  CashMovement,
  ClothingType,
  Color,
  PaymentMethod,
  Product,
  RegistryItem,
  RegistryKind,
  Size,
  StockMovement,
  StockMovementReason,
  StockMovementType,
} from '../types/database'

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

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    cost_price: normalizeNumber(product.cost_price),
    sale_price: normalizeNumber(product.sale_price),
    suggested_price:
      product.suggested_price === null || product.suggested_price === undefined
        ? null
        : Number(product.suggested_price),
    stock_quantity: normalizeNumber(product.stock_quantity),
    min_stock: normalizeNumber(product.min_stock),
    active: Boolean(product.active),
  }
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

export interface ProductFilters {
  query?: string
  brandId?: string
  clothingTypeId?: string
  sizeId?: string
  colorId?: string
  active?: boolean | null
  lowStock?: boolean
}

const productSelect = `
  *,
  brand:brands(id, name, description, active, created_at, updated_at),
  clothing_type:clothing_types(id, name, description, active, created_at, updated_at),
  size:sizes(id, name, sort_order, active, created_at, updated_at),
  color:colors(id, name, hex, active, created_at, updated_at)
`

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
        product.brand?.name,
        product.clothing_type?.name,
        product.color?.name,
        product.size?.name,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query)),
    )
  }

  if (filters.lowStock) {
    products = products.filter((product) => product.stock_quantity <= product.min_stock)
  }

  return products
}

export async function createProduct(input: ProductInput, user: User | null) {
  const client = getSupabase()
  const { data, error } = await client
    .from('products')
    .insert({
      ...toProductPayload(input),
      user_id: user?.id ?? null,
    })
    .select(productSelect)
    .single()

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

export async function updateProduct(id: string, input: ProductInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('products')
    .update(toProductPayload(input))
    .eq('id', id)
    .select(productSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeProduct(data as Product)
}

export async function deleteProduct(id: string) {
  const client = getSupabase()
  const { error } = await client.from('products').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function findProductForSale(query: string) {
  const products = await listProducts({ query: query.trim(), active: true })
  const normalized = query.trim().toLowerCase()

  return (
    products.find((product) => product.barcode?.toLowerCase() === normalized) ??
    products.find((product) => product.name.toLowerCase() === normalized) ??
    products[0] ??
    null
  )
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
    .select('id, stock_quantity')
    .eq('id', productId)
    .single()

  if (productError) {
    throw new Error(productError.message)
  }

  if (applyStockUpdate) {
    const currentStock = Number(product.stock_quantity ?? 0)
    const nextStock = type === 'entrada' ? currentStock + quantity : currentStock - quantity

    if (nextStock < 0) {
      throw new Error('Estoque insuficiente para registrar esta saída.')
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
  const { data, error } = await client
    .from('stock_movements')
    .select(
      `
        *,
        product:products(
          *,
          brand:brands(id, name, description, active, created_at, updated_at),
          clothing_type:clothing_types(id, name, description, active, created_at, updated_at),
          size:sizes(id, name, sort_order, active, created_at, updated_at),
          color:colors(id, name, hex, active, created_at, updated_at)
        )
      `,
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as StockMovement[]).map((movement) => ({
    ...movement,
    product: movement.product ? normalizeProduct(movement.product) : null,
  }))
}

export interface SaleLineInput {
  product: Product
  quantity: number
  unitPrice: number
}

export async function finalizeSale(
  items: SaleLineInput[],
  paymentMethod: PaymentMethod,
  user: User | null,
) {
  if (items.length === 0) {
    throw new Error('Adicione pelo menos um item para finalizar a venda.')
  }

  const client = getSupabase()
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  for (const item of items) {
    const { data: product, error } = await client
      .from('products')
      .select('id, stock_quantity')
      .eq('id', item.product.id)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    if (Number(product.stock_quantity ?? 0) < item.quantity) {
      throw new Error(`Estoque insuficiente para ${item.product.name}.`)
    }
  }

  const { data: sale, error: saleError } = await client
    .from('sales')
    .insert({
      user_id: user?.id ?? null,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      status: 'finalizada',
    })
    .select()
    .single()

  if (saleError) {
    throw new Error(saleError.message)
  }

  const saleItems = items.map((item) => ({
    sale_id: sale.id,
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.quantity * item.unitPrice,
  }))

  const { error: itemsError } = await client.from('sale_items').insert(saleItems)
  if (itemsError) {
    throw new Error(itemsError.message)
  }

  for (const item of items) {
    await createStockMovement({
      productId: item.product.id,
      type: 'saida',
      reason: 'venda',
      quantity: item.quantity,
      notes: `Venda ${sale.id}`,
      user,
    })
  }

  const cashMovement: Omit<CashMovement, 'id' | 'created_at'> = {
    user_id: user?.id ?? null,
    sale_id: sale.id,
    type: 'entrada',
    description: `Venda ${sale.id}`,
    amount: totalAmount,
    movement_date: new Date().toISOString().slice(0, 10),
    payment_method: paymentMethod,
    notes: null,
  }

  const { error: cashError } = await client.from('cash_movements').insert(cashMovement)
  if (cashError) {
    throw new Error(cashError.message)
  }
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
