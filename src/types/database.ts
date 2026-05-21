export type EntityStatus = 'active' | 'inactive'
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'outro'
export type StockMovementType = 'entrada' | 'saida'
export type StockMovementReason =
  | 'cadastro_inicial'
  | 'compra'
  | 'venda'
  | 'ajuste_manual'
  | 'troca'
  | 'perda'
export type CashMovementType = 'income' | 'expense'
export type CashMovementOrigin = 'sale' | 'manual_expense' | 'manual_income' | 'stock'
export type CashSessionStatus = 'open' | 'closed'
export type SaleStatus = 'aberta' | 'finalizada' | 'cancelada'

export interface UserProfile {
  id: string
  user_id: string
  name: string
  role: 'admin' | 'operator'
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id?: string | null
  name: string
  description?: string | null
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  name: string
  description?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface ClothingType {
  id: string
  name: string
  description?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Size {
  id: string
  name: string
  sort_order?: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface Color {
  id: string
  name: string
  hex?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export type RegistryKind = 'brands' | 'clothing_types' | 'sizes' | 'colors'
export type RegistryItem = Brand | ClothingType | Size | Color

export interface ProductModel {
  id: string
  user_id?: string | null
  reference: string
  name: string
  family?: string | null
  brand_id?: string | null
  category_id?: string | null
  created_at: string
  updated_at: string
  brand?: Brand | null
  category?: ClothingType | null
}

export interface Product {
  id: string
  user_id?: string | null
  name: string
  barcode?: string | null
  product_model_id?: string | null
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
  created_at: string
  updated_at: string
  product_model?: ProductModel | null
  brand?: Brand | null
  clothing_type?: ClothingType | null
  size?: Size | null
  color?: Color | null
}

export type ProductWithRelations = Product

export interface Customer {
  id: string
  user_id?: string | null
  name: string
  phone?: string | null
  email?: string | null
  cpf?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  user_id?: string | null
  customer_id?: string | null
  total_amount: number
  payment_method: PaymentMethod
  status: SaleStatus
  sale_date: string
  created_at: string
  updated_at: string
  customer?: Customer | null
  sale_items?: SaleItem[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  product?: Product | null
}

export interface StockMovement {
  id: string
  user_id?: string | null
  product_id: string
  sale_id?: string | null
  cash_movement_id?: string | null
  type: StockMovementType
  reason: StockMovementReason
  quantity: number
  notes?: string | null
  created_at: string
  product?: Product | null
  sale?: Sale | null
  cash_movement?: CashMovement | null
}

export interface CashMovement {
  id: string
  user_id?: string | null
  created_by?: string | null
  sale_id?: string | null
  cash_session_id?: string | null
  movement_code?: string | null
  type: CashMovementType
  origin?: CashMovementOrigin | null
  description: string
  amount: number
  movement_date: string
  payment_method?: PaymentMethod | null
  notes?: string | null
  created_at: string
  updated_at?: string | null
  sale?: Sale | null
}

export interface CashSession {
  id: string
  session_date: string
  opening_amount: number
  closing_amount?: number | null
  expected_amount?: number | null
  difference_amount?: number | null
  status: CashSessionStatus
  opened_at: string
  closed_at?: string | null
  opened_by?: string | null
  closed_by?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}
