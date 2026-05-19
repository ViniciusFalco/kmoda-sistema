import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  Brand,
  CashMovement,
  CashSession,
  CashMovementType,
  ClothingType,
  Color,
  Customer,
  PaymentMethod,
  Product,
  RegistryItem,
  RegistryKind,
  Size,
  StockMovement,
  StockMovementReason,
  StockMovementType,
} from '../types/database'
import { getNowLocalTimestamp, todayISODate } from './utils'

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

function normalizeCashMovement(movement: CashMovement): CashMovement {
  const legacyType = movement.type as CashMovementType | 'entrada' | 'saida'
  const type: CashMovementType = legacyType === 'entrada' ? 'income' : legacyType === 'saida' ? 'expense' : legacyType

  return {
    ...movement,
    type,
    origin: movement.origin ?? (movement.sale_id ? 'sale' : type === 'income' ? 'manual_income' : 'manual_expense'),
    amount: Math.abs(normalizeNumber(movement.amount)),
    sale: movement.sale
      ? {
          ...movement.sale,
          total_amount: normalizeNumber(movement.sale.total_amount),
          sale_items: movement.sale.sale_items?.map((item) => ({
            ...item,
            quantity: normalizeNumber(item.quantity),
            unit_price: normalizeNumber(item.unit_price),
            total_price: normalizeNumber(item.total_price),
            product: item.product ? normalizeProduct(item.product) : null,
          })),
        }
      : null,
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
        ),
        sale:sales(id, total_amount, payment_method, status, sale_date, created_at, updated_at),
        cash_movement:cash_movements(id, movement_code, description, amount, movement_date)
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

export interface CashExpenseInput {
  description: string
  amount: number
  movementDate: string
  paymentMethod: PaymentMethod
  notes?: string | null
  user?: User | null
  cashSessionId?: string | null
}

export interface CashIncomeInput {
  description: string
  amount: number
  movementDate: string
  paymentMethod: PaymentMethod
  notes?: string | null
  user?: User | null
  cashSessionId?: string | null
}

export interface SaleRegistrationInput {
  items: SaleLineInput[]
  paymentMethod: PaymentMethod
  movementDate: string
  notes?: string | null
  user?: User | null
  cashSessionId?: string | null
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
}

export interface CloseCashSessionInput {
  sessionId: string
  closingAmount: number
  expectedAmount: number
  differenceAmount: number
  notes?: string | null
  user?: User | null
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

const cashMovementSelect = `
  *,
  sale:sales(
    *,
    sale_items(
      *,
      product:products(
        *,
        brand:brands(id, name, description, active, created_at, updated_at),
        clothing_type:clothing_types(id, name, description, active, created_at, updated_at),
        size:sizes(id, name, sort_order, active, created_at, updated_at),
        color:colors(id, name, hex, active, created_at, updated_at)
      )
    )
  )
`

function normalizeCashSession(session: CashSession): CashSession {
  return {
    ...session,
    opening_amount: normalizeNumber(session.opening_amount),
    closing_amount: session.closing_amount === null || session.closing_amount === undefined ? null : Number(session.closing_amount),
    expected_amount: session.expected_amount === null || session.expected_amount === undefined ? null : Number(session.expected_amount),
    difference_amount: session.difference_amount === null || session.difference_amount === undefined ? null : Number(session.difference_amount),
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

export async function openCashSession(input: OpenCashSessionInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_sessions')
    .insert({
      session_date: todayISODate(),
      opening_amount: input.openingAmount,
      status: 'open',
      opened_by: input.user?.id ?? null,
      notes: normalizeNullable(input.notes),
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeCashSession(data as CashSession)
}

export async function closeCashSession(input: CloseCashSessionInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_sessions')
    .update({
      closing_amount: input.closingAmount,
      expected_amount: input.expectedAmount,
      difference_amount: input.differenceAmount,
      status: 'closed',
      closed_at: getNowLocalTimestamp(),
      closed_by: input.user?.id ?? null,
      notes: normalizeNullable(input.notes),
    })
    .eq('id', input.sessionId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeCashSession(data as CashSession)
}

export async function listTodayCashMovements(date = todayISODate()) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_movements')
    .select(cashMovementSelect)
    .eq('movement_date', date)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as CashMovement[]).map(normalizeCashMovement)
}

export async function searchCashMovements(filters: CashMovementFilters): Promise<CashMovementSearchResult> {
  const client = getSupabase()
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 25
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let request = client
    .from('cash_movements')
    .select(cashMovementSelect, { count: 'exact' })
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filters.type && filters.type !== 'all') {
    request = request.eq('type', filters.type)
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

  const { data, error, count } = await request

  if (error) {
    throw new Error(error.message)
  }

  return {
    data: ((data ?? []) as CashMovement[]).map(normalizeCashMovement),
    count: count ?? 0,
    page,
    pageSize,
  }
}

export async function createCashExpense(input: CashExpenseInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_movements')
    .insert({
      user_id: input.user?.id ?? null,
      created_by: input.user?.id ?? null,
      cash_session_id: input.cashSessionId ?? null,
      type: 'expense',
      origin: 'manual_expense',
      description: input.description.trim(),
      amount: Math.abs(input.amount),
      movement_date: input.movementDate,
      payment_method: input.paymentMethod,
      notes: normalizeNullable(input.notes),
    } as never)
    .select(cashMovementSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeCashMovement(data as CashMovement)
}

export async function createCashIncome(input: CashIncomeInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('cash_movements')
    .insert({
      user_id: input.user?.id ?? null,
      created_by: input.user?.id ?? null,
      cash_session_id: input.cashSessionId ?? null,
      type: 'income',
      origin: 'manual_income',
      description: input.description.trim(),
      amount: Math.abs(input.amount),
      movement_date: input.movementDate,
      payment_method: input.paymentMethod,
      notes: normalizeNullable(input.notes),
    } as never)
    .select(cashMovementSelect)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeCashMovement(data as CashMovement)
}

export async function registerSaleWithCashAndStock(input: SaleRegistrationInput) {
  if (input.items.length === 0) {
    throw new Error('Adicione pelo menos um item para registrar a venda.')
  }

  const client = getSupabase()
  const rpcItems = input.items.map((item) => ({
    product_id: item.product.id,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }))

  const { data, error } = await client.rpc('register_sale_with_cash_and_stock', {
    p_items: rpcItems,
    p_payment_method: input.paymentMethod,
    p_movement_date: input.movementDate,
    p_notes: normalizeNullable(input.notes),
    p_user_id: input.user?.id ?? null,
    p_cash_session_id: input.cashSessionId ?? null,
  } as never)

  if (error) {
    throw new Error(error.message)
  }

  return data as { sale_id: string; cash_movement_id: string; movement_code: string }
}

export async function finalizeSale(
  items: SaleLineInput[],
  paymentMethod: PaymentMethod,
  user: User | null,
) {
  await registerSaleWithCashAndStock({
    items,
    paymentMethod,
    movementDate: todayISODate(),
    user,
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
