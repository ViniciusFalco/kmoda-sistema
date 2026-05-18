export type EntityStatus = 'active' | 'inactive'
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito'
export type StockMovementType = 'entrada' | 'saida'
export type StockMovementReason =
  | 'cadastro_inicial'
  | 'compra'
  | 'venda'
  | 'ajuste_manual'
  | 'troca'
  | 'perda'
export type CashMovementType = 'entrada' | 'saida'
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

export interface Product {
  id: string
  user_id?: string | null
  name: string
  brand?: string | null
  reference?: string | null
  barcode?: string | null
  category_id?: string | null
  cost_price: number
  sale_price: number
  suggested_price?: number | null
  stock_quantity: number
  min_stock: number
  size?: string | null
  color?: string | null
  description?: string | null
  active: boolean
  created_at: string
  updated_at: string
  category?: Category | null
}

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
  type: StockMovementType
  reason: StockMovementReason
  quantity: number
  notes?: string | null
  created_at: string
  product?: Product | null
}

export interface CashMovement {
  id: string
  user_id?: string | null
  sale_id?: string | null
  type: CashMovementType
  description: string
  amount: number
  movement_date: string
  payment_method: PaymentMethod
  notes?: string | null
  created_at: string
}
