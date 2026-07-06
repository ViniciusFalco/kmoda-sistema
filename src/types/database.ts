export type EntityStatus = 'active' | 'inactive'
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'outro' | 'promissoria'
export type SalePricingKind = 'cash' | 'installment'
export type SalePaymentSourceKind = 'cash_total' | 'installment_group' | 'promissory_group'
export type StockMovementType = 'entrada' | 'saida'
export type StockMovementReason =
  | 'cadastro_inicial'
  | 'compra'
  | 'devolucao'
  | 'ajuste_positivo'
  | 'correcao_estoque'
  | 'venda'
  | 'venda_manual'
  | 'ajuste_manual'
  | 'troca'
  | 'perda'
  | 'avaria'
  | 'ajuste_negativo'
  | 'devolucao_ao_fornecedor'
export type CashMovementType = 'income' | 'expense'
export type CashMovementOrigin = 'sale' | 'promissory' | 'manual_expense' | 'manual_income' | 'stock'
export type CashSessionStatus = 'open' | 'closed'
export type SaleStatus = 'aberta' | 'finalizada' | 'cancelada'
export type MonitoringSpaceStatus = 'normal' | 'attention' | 'warning' | 'critical'
export type MonitoringPauseRisk = 'baixo' | 'médio' | 'alto' | 'crítico'
export type AppActivityType =
  | 'login'
  | 'product_create'
  | 'product_update'
  | 'sale'
  | 'sale_update'
  | 'expense'
  | 'expense_update'
  | 'cash_movement'
  | 'cash_movement_update'
  | 'stock_movement'
  | 'stock_movement_update'
  | 'customer_create'
  | 'customer_update'

export type UserRole = 'admin' | 'cashier' | 'operator'

export interface UserProfile {
  id: string
  user_id: string
  name: string
  role: UserRole
  active: boolean
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

export interface ProductSnapshot {
  id?: string | null
  name: string
  barcode?: string | null
  reference?: string | null
  product_model_id?: string | null
  product_model_name?: string | null
  product_model_reference?: string | null
  product_model_family?: string | null
  brand_id?: string | null
  brand_name?: string | null
  clothing_type_id?: string | null
  clothing_type_name?: string | null
  size_id?: string | null
  size_name?: string | null
  color_id?: string | null
  color_name?: string | null
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
  created_by_user_id?: string | null
  created_by_name?: string | null
  created_by_role?: UserRole | null
  confirmed_with_pin_at?: string | null
  customer_id?: string | null
  total_amount: number
  payment_method: PaymentMethod
  installments_count: number
  status: SaleStatus
  sale_date: string
  created_at: string
  updated_at: string
  customer?: Customer | null
  sale_items?: SaleItem[]
  sale_payments?: SalePayment[]
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string | null
  quantity: number
  pricing_kind: SalePricingKind
  original_unit_price: number
  unit_price: number
  total_price: number
  installments_count: number
  installment_value: number
  created_at: string
  product_snapshot?: ProductSnapshot | null
  product?: Product | null
}

export interface SalePayment {
  id: string
  sale_id: string
  source_kind: SalePaymentSourceKind
  payment_method: PaymentMethod
  amount: number
  installments_count: number
  installment_value: number
  cash_movement_id?: string | null
  created_at: string
}

export type PromissoryNoteStatus = 'open' | 'paid' | 'cancelled'
export type PromissoryInstallmentStatus = 'pending' | 'paid' | 'cancelled'

export interface PromissoryInstallment {
  id: string
  promissory_note_id: string
  installment_number: number
  due_date: string
  amount: number
  status: PromissoryInstallmentStatus
  paid_at?: string | null
  payment_method?: PaymentMethod | null
  cash_movement_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface PromissoryNote {
  id: string
  sale_id: string
  customer_id?: string | null
  total_amount: number
  installments_count: number
  interval_days: number
  first_due_date: string
  status: PromissoryNoteStatus
  notes?: string | null
  created_at: string
  updated_at: string
  sale?: Sale | null
  customer?: Customer | null
  installments?: PromissoryInstallment[]
  paid_amount?: number
  remaining_amount?: number
}

export interface StockMovement {
  id: string
  user_id?: string | null
  product_id: string | null
  sale_id?: string | null
  cash_movement_id?: string | null
  type: StockMovementType
  reason: StockMovementReason
  quantity: number
  notes?: string | null
  created_at: string
  product_snapshot?: ProductSnapshot | null
  product?: Product | null
  sale?: Sale | null
  cash_movement?: CashMovement | null
}

export interface CashMovement {
  id: string
  user_id?: string | null
  created_by?: string | null
  created_by_user_id?: string | null
  created_by_name?: string | null
  created_by_role?: UserRole | null
  confirmed_with_pin_at?: string | null
  sale_id?: string | null
  sale_payment_id?: string | null
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
  sale_payment?: SalePayment | null
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

export interface CashHistoryMovement extends CashMovement {
  kind: 'movement'
}

export type CashSessionEventType = 'open' | 'close'

export interface CashSessionHistoryEvent {
  kind: 'session'
  eventType: CashSessionEventType
  session: CashSession
  id: string
  movement_code: string
  type: 'session'
  origin: 'session_open' | 'session_close'
  description: string
  amount: number
  movement_date: string
  payment_method: null
  notes?: string | null
  created_at: string
  updated_at?: string | null
  sale?: null
}

export type CashHistoryEntry = CashHistoryMovement | CashSessionHistoryEvent

export interface AppActivity {
  id: string
  activity_type: AppActivityType | string
  source_table?: string | null
  record_id?: string | null
  actor_user_id?: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface KmodaStorageUsage {
  used_bytes: number
  used_mb: number
  limit_mb: number
  percent_used: number
  status: MonitoringSpaceStatus
}

export interface AppPauseRisk {
  last_activity_at: string | null
  estimated_pause_at: string | null
  estimated_days_until_pause: number | null
  pause_risk: MonitoringPauseRisk
}
