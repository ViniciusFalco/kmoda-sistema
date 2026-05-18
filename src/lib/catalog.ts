import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Category, Product } from '../types/database'

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

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    cost_price: Number(product.cost_price),
    sale_price: Number(product.sale_price),
    suggested_price:
      product.suggested_price === null || product.suggested_price === undefined
        ? null
        : Number(product.suggested_price),
    stock_quantity: Number(product.stock_quantity),
    min_stock: Number(product.min_stock),
    active: Boolean(product.active),
  }
}

export interface CategoryInput {
  name: string
  description?: string | null
}

export interface ProductInput {
  name: string
  brand?: string | null
  reference?: string | null
  barcode?: string | null
  category_id: string
  cost_price: number
  sale_price: number
  suggested_price?: number | null
  stock_quantity: number
  min_stock: number
  size?: string | null
  color?: string | null
  description?: string | null
  active: boolean
}

export async function listCategories() {
  const client = getSupabase()
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Category[]
}

export async function createCategory(input: CategoryInput, user: User | null) {
  const client = getSupabase()
  const { data, error } = await client
    .from('categories')
    .insert({
      name: input.name.trim(),
      description: normalizeNullable(input.description),
      user_id: user?.id ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Category
}

export async function updateCategory(id: string, input: CategoryInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('categories')
    .update({
      name: input.name.trim(),
      description: normalizeNullable(input.description),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Category
}

export async function deleteCategory(id: string) {
  const client = getSupabase()
  const { error } = await client.from('categories').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export interface ProductFilters {
  query?: string
  categoryId?: string
  size?: string
  color?: string
  active?: boolean | null
  lowStock?: boolean
}

export async function listProducts(filters: ProductFilters = {}) {
  const client = getSupabase()
  let request = client
    .from('products')
    .select('*, category:categories(id, user_id, name, description, created_at, updated_at)')
    .order('name', { ascending: true })

  const query = filters.query?.trim()
  if (query) {
    const sanitized = query.replaceAll(',', ' ')
    request = request.or(
      `name.ilike.%${sanitized}%,reference.ilike.%${sanitized}%,barcode.ilike.%${sanitized}%,brand.ilike.%${sanitized}%`,
    )
  }

  if (filters.categoryId) {
    request = request.eq('category_id', filters.categoryId)
  }

  if (filters.size) {
    request = request.ilike('size', `%${filters.size}%`)
  }

  if (filters.color) {
    request = request.ilike('color', `%${filters.color}%`)
  }

  if (filters.active !== null && filters.active !== undefined) {
    request = request.eq('active', filters.active)
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  const products = ((data ?? []) as Product[]).map(normalizeProduct)
  return filters.lowStock
    ? products.filter((product) => product.stock_quantity <= product.min_stock)
    : products
}

export async function createProduct(input: ProductInput, user: User | null) {
  const client = getSupabase()
  const { data, error } = await client
    .from('products')
    .insert({
      ...toProductPayload(input),
      user_id: user?.id ?? null,
    })
    .select('*, category:categories(id, user_id, name, description, created_at, updated_at)')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const product = normalizeProduct(data as Product)

  if (product.stock_quantity > 0) {
    const { error: movementError } = await client.from('stock_movements').insert({
      user_id: user?.id ?? null,
      product_id: product.id,
      type: 'entrada',
      reason: 'cadastro_inicial',
      quantity: product.stock_quantity,
      notes: 'Quantidade inicial informada no cadastro do produto.',
    })

    if (movementError) {
      throw new Error(movementError.message)
    }
  }

  return product
}

export async function updateProduct(id: string, input: ProductInput) {
  const client = getSupabase()
  const { data, error } = await client
    .from('products')
    .update(toProductPayload(input))
    .eq('id', id)
    .select('*, category:categories(id, user_id, name, description, created_at, updated_at)')
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
    products.find((product) => product.reference?.toLowerCase() === normalized) ??
    products[0] ??
    null
  )
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

function toProductPayload(input: ProductInput) {
  return {
    name: input.name.trim(),
    brand: normalizeNullable(input.brand),
    reference: normalizeNullable(input.reference),
    barcode: normalizeNullable(input.barcode),
    category_id: input.category_id,
    cost_price: input.cost_price,
    sale_price: input.sale_price,
    suggested_price: input.suggested_price ?? null,
    stock_quantity: input.stock_quantity,
    min_stock: input.min_stock,
    size: normalizeNullable(input.size),
    color: normalizeNullable(input.color),
    description: normalizeNullable(input.description),
    active: input.active,
  }
}
