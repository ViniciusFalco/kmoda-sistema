import { listCustomers, listProducts, formatSalePaymentSummary } from './catalog'
import { isSupabaseConfigured, supabase } from './supabase'
import { formatCurrencyBRL, formatDateBR, formatDateTimeBR } from './utils'
import type {
  Brand,
  CashMovement,
  CashSession,
  Category,
  ClothingType,
  Color,
  Customer,
  Product,
  ProductModel,
  Sale,
  SaleItem,
  SalePayment,
  Size,
  StockMovement,
} from '../types/database'

type BackupTableKey =
  | 'categories'
  | 'brands'
  | 'clothing_types'
  | 'sizes'
  | 'colors'
  | 'product_models'
  | 'products'
  | 'customers'
  | 'sales'
  | 'sale_items'
  | 'sale_payments'
  | 'stock_movements'
  | 'cash_movements'
  | 'cash_sessions'

export interface KModaBackupTables {
  categories: Category[]
  brands: Brand[]
  clothing_types: ClothingType[]
  sizes: Size[]
  colors: Color[]
  product_models: ProductModel[]
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  sale_items: SaleItem[]
  sale_payments: SalePayment[]
  stock_movements: StockMovement[]
  cash_movements: CashMovement[]
  cash_sessions: CashSession[]
}

export interface KModaBackupFile {
  meta: {
    app: 'KModa'
    version: 1
    exported_at: string
    exported_at_local: string
    generated_file: string
    warnings: string[]
    failed_tables: BackupTableKey[]
  }
  tables: Partial<KModaBackupTables>
}

export type CsvExportKind = 'products' | 'customers' | 'sales' | 'expenses' | 'stock' | 'cash'

export interface CsvExportResult {
  fileName: string
  csv: string
}

interface CsvColumn<T> {
  header: string
  value: (row: T) => unknown
}

function getClient() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  }

  return supabase
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function formatFileDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatFileDateTime(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}`
}

function formatLocalTimestamp(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  const raw =
    typeof value === 'string'
      ? value
      : value instanceof Date
        ? value.toISOString()
        : typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value)

  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`
  }

  return raw
}

export function objectsToCsv<T>(rows: T[], columns: Array<CsvColumn<T>>) {
  const headerLine = columns.map((column) => escapeCsvValue(column.header)).join(',')
  const bodyLines = rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(','))
  return [headerLine, ...bodyLines].join('\n')
}

export function downloadTextFile(content: string, fileName: string, mimeType = 'text/plain;charset=utf-8') {
  if (typeof document === 'undefined') {
    return
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

export function downloadJsonFile(data: unknown, fileName: string) {
  downloadTextFile(JSON.stringify(data, null, 2), fileName, 'application/json;charset=utf-8')
}

export function getBackupFileName(date = new Date()) {
  return `backup-kmoda-${formatFileDateTime(date)}.json`
}

export function getCsvFileName(prefix: string, date = new Date()) {
  return `${prefix}-kmoda-${formatFileDate(date)}.csv`
}

async function fetchTableRows<T>(table: string) {
  const client = getClient()
  const { data, error } = await client.from(table).select('*')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as T[]
}

function mapSaleItemSummary(item: SaleItem) {
  const productName = item.product?.product_model?.name ?? item.product?.name ?? 'Produto'
  return `${item.quantity}x ${productName}`
}

function mapSaleRowsForCsv(rows: Sale[]) {
  return rows.map((sale) => ({
    id: sale.id,
    sale_date: formatDateTimeBR(sale.sale_date),
    customer_name: sale.customer?.name ?? '',
    customer_phone: sale.customer?.phone ?? '',
    customer_email: sale.customer?.email ?? '',
    status: sale.status,
    payment_summary: formatSalePaymentSummary(sale),
    payment_method: sale.payment_method,
    installments_count: sale.installments_count,
    total_amount: formatCurrencyBRL(Number(sale.total_amount ?? 0)),
    items_count: sale.sale_items?.length ?? 0,
    items_summary: sale.sale_items?.map(mapSaleItemSummary).join(' | ') ?? '',
    created_at: formatDateTimeBR(sale.created_at),
    updated_at: formatDateTimeBR(sale.updated_at),
  }))
}

function mapProductRowsForCsv(rows: Product[]) {
  return rows.map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode ?? '',
    reference: product.reference ?? product.product_model?.reference ?? '',
    model_name: product.product_model?.name ?? '',
    family: product.product_model?.family ?? '',
    brand: product.brand?.name ?? product.product_model?.brand?.name ?? '',
    clothing_type: product.clothing_type?.name ?? product.product_model?.category?.name ?? '',
    size: product.size?.name ?? '',
    color: product.color?.name ?? '',
    cost_price: formatCurrencyBRL(Number(product.cost_price ?? 0)),
    sale_price: formatCurrencyBRL(Number(product.sale_price ?? 0)),
    suggested_price: formatCurrencyBRL(Number(product.suggested_price ?? 0)),
    stock_quantity: product.stock_quantity,
    min_stock: product.min_stock,
    active: product.active ? 'Ativo' : 'Inativo',
    created_at: formatDateTimeBR(product.created_at),
    updated_at: formatDateTimeBR(product.updated_at),
  }))
}

function mapCustomerRowsForCsv(rows: Customer[]) {
  return rows.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    cpf: customer.cpf ?? '',
    notes: customer.notes ?? '',
    created_at: formatDateTimeBR(customer.created_at),
    updated_at: formatDateTimeBR(customer.updated_at),
  }))
}

function mapCashMovementRowsForCsv(rows: CashMovement[]) {
  return rows.map((movement) => ({
    id: movement.id,
    movement_code: movement.movement_code ?? '',
    type: movement.type,
    origin: movement.origin ?? '',
    description: movement.description,
    amount: formatCurrencyBRL(Number(movement.amount ?? 0)),
    movement_date: formatDateBR(movement.movement_date),
    payment_method: movement.payment_method ?? '',
    notes: movement.notes ?? '',
    sale_id: movement.sale_id ?? '',
    sale_payment_id: movement.sale_payment_id ?? '',
    cash_session_id: movement.cash_session_id ?? '',
    created_at: formatDateTimeBR(movement.created_at),
    updated_at: formatDateTimeBR(movement.updated_at ?? null),
  }))
}

function mapStockMovementRowsForCsv(rows: StockMovement[]) {
  return rows.map((movement) => ({
    id: movement.id,
    product_name: movement.product?.product_model?.name ?? movement.product?.name ?? '',
    product_reference: movement.product?.reference ?? movement.product?.product_model?.reference ?? '',
    product_barcode: movement.product?.barcode ?? '',
    type: movement.type,
    reason: movement.reason,
    quantity: movement.quantity,
    notes: movement.notes ?? '',
    sale_id: movement.sale_id ?? '',
    cash_movement_id: movement.cash_movement_id ?? '',
    created_at: formatDateTimeBR(movement.created_at),
  }))
}

async function fetchSalesForExport() {
  const client = getClient()
  const { data, error } = await client
    .from('sales')
    .select(
      `
        id,
        user_id,
        customer_id,
        total_amount,
        payment_method,
        installments_count,
        status,
        sale_date,
        created_at,
        updated_at,
        customer:customers(id, name, phone, email, cpf),
        sale_items(
          id,
          sale_id,
          product_id,
          quantity,
          pricing_kind,
          original_unit_price,
          unit_price,
          total_price,
          installments_count,
          installment_value,
          created_at,
          product:products(
            id,
            name,
            barcode,
            reference,
            product_model:product_models(id, reference, name, family)
          )
        ),
        sale_payments(
          id,
          sale_id,
          source_kind,
          payment_method,
          amount,
          installments_count,
          installment_value,
          cash_movement_id,
          created_at
        )
      `,
    )
    .order('sale_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as Sale[]
}

async function fetchCashMovementsForExport(type?: 'expense') {
  const client = getClient()
  let request = client
    .from('cash_movements')
    .select(
      `
        id,
        user_id,
        created_by,
        sale_id,
        sale_payment_id,
        cash_session_id,
        movement_code,
        type,
        origin,
        description,
        amount,
        movement_date,
        payment_method,
        notes,
        created_at,
        updated_at,
        sale:sales(
          id,
          total_amount,
          sale_date,
          customer:customers(id, name)
        ),
        sale_payment:sale_payments(
          id,
          source_kind,
          payment_method,
          amount,
          installments_count,
          installment_value,
          created_at
        )
      `,
    )
    .order('movement_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) {
    request = request.eq('type', type)
  }

  const { data, error } = await request

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as CashMovement[]
}

async function fetchStockMovementsForExport() {
  const client = getClient()
  const { data, error } = await client
    .from('stock_movements')
    .select(
      `
        id,
        user_id,
        product_id,
        sale_id,
        cash_movement_id,
        type,
        reason,
        quantity,
        notes,
        created_at,
        product:products(
          id,
          name,
          barcode,
          reference,
          product_model:product_models(id, reference, name, family),
          brand:brands(id, name),
          clothing_type:clothing_types(id, name),
          size:sizes(id, name),
          color:colors(id, name)
        ),
        cash_movement:cash_movements(id, movement_code, description, amount, movement_date),
        sale:sales(id, sale_date, total_amount)
      `,
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as StockMovement[]
}

export async function buildBackupExport() {
  const requestedTables: Array<{ key: BackupTableKey; table: string }> = [
    { key: 'categories', table: 'categories' },
    { key: 'brands', table: 'brands' },
    { key: 'clothing_types', table: 'clothing_types' },
    { key: 'sizes', table: 'sizes' },
    { key: 'colors', table: 'colors' },
    { key: 'product_models', table: 'product_models' },
    { key: 'products', table: 'products' },
    { key: 'customers', table: 'customers' },
    { key: 'sales', table: 'sales' },
    { key: 'sale_items', table: 'sale_items' },
    { key: 'sale_payments', table: 'sale_payments' },
    { key: 'stock_movements', table: 'stock_movements' },
    { key: 'cash_movements', table: 'cash_movements' },
    { key: 'cash_sessions', table: 'cash_sessions' },
  ]

  const settled = await Promise.allSettled(
    requestedTables.map(async ({ key, table }) => {
      const rows = await fetchTableRows<unknown>(table)
      return { key, rows }
    }),
  )

  const tables: Partial<KModaBackupTables> = {}
  const warnings: string[] = []
  const failedTables: BackupTableKey[] = []

  settled.forEach((result, index) => {
    const tableConfig = requestedTables[index]

    if (result.status === 'fulfilled') {
      tables[tableConfig.key] = result.value.rows as never
      return
    }

    failedTables.push(tableConfig.key)
    const message = result.reason instanceof Error ? result.reason.message : 'Falha desconhecida.'
    warnings.push(`A tabela "${tableConfig.table}" não pôde ser exportada: ${message}`)
    console.error(`Falha ao exportar a tabela "${tableConfig.table}"`, result.reason)
  })

  const exportedTables = Object.keys(tables)

  if (exportedTables.length === 0) {
    throw new Error('Nenhuma tabela pôde ser exportada.')
  }

  const now = new Date()
  const fileName = getBackupFileName(now)

  return {
    fileName,
    data: {
      meta: {
        app: 'KModa' as const,
        version: 1 as const,
        exported_at: now.toISOString(),
        exported_at_local: formatLocalTimestamp(now),
        generated_file: fileName,
        warnings,
        failed_tables: failedTables,
      },
      tables,
    } satisfies KModaBackupFile,
    warnings,
    failedTables,
  }
}

export async function buildCsvExport(kind: CsvExportKind): Promise<CsvExportResult> {
  const now = new Date()

  switch (kind) {
    case 'products': {
      const rows = mapProductRowsForCsv(await listProducts())
      return {
        fileName: getCsvFileName('produtos', now),
        csv: `\uFEFF${objectsToCsv(rows, [
          { header: 'ID', value: (row) => row.id },
          { header: 'Nome', value: (row) => row.name },
          { header: 'Código de barras', value: (row) => row.barcode },
          { header: 'Referência', value: (row) => row.reference },
          { header: 'Modelo', value: (row) => row.model_name },
          { header: 'Família', value: (row) => row.family },
          { header: 'Marca', value: (row) => row.brand },
          { header: 'Tipo de roupa', value: (row) => row.clothing_type },
          { header: 'Tamanho', value: (row) => row.size },
          { header: 'Cor', value: (row) => row.color },
          { header: 'Custo', value: (row) => row.cost_price },
          { header: 'Venda', value: (row) => row.sale_price },
          { header: 'Sugestão', value: (row) => row.suggested_price },
          { header: 'Estoque', value: (row) => row.stock_quantity },
          { header: 'Estoque mínimo', value: (row) => row.min_stock },
          { header: 'Status', value: (row) => row.active },
          { header: 'Criado em', value: (row) => row.created_at },
          { header: 'Atualizado em', value: (row) => row.updated_at },
        ])}`,
      }
    }
    case 'customers': {
      const rows = mapCustomerRowsForCsv(await listCustomers())
      return {
        fileName: getCsvFileName('clientes', now),
        csv: `\uFEFF${objectsToCsv(rows, [
          { header: 'ID', value: (row) => row.id },
          { header: 'Nome', value: (row) => row.name },
          { header: 'Telefone', value: (row) => row.phone },
          { header: 'E-mail', value: (row) => row.email },
          { header: 'CPF', value: (row) => row.cpf },
          { header: 'Observações', value: (row) => row.notes },
          { header: 'Criado em', value: (row) => row.created_at },
          { header: 'Atualizado em', value: (row) => row.updated_at },
        ])}`,
      }
    }
    case 'sales': {
      const rows = mapSaleRowsForCsv(await fetchSalesForExport())
      return {
        fileName: getCsvFileName('vendas', now),
        csv: `\uFEFF${objectsToCsv(rows, [
          { header: 'ID', value: (row) => row.id },
          { header: 'Data da venda', value: (row) => row.sale_date },
          { header: 'Cliente', value: (row) => row.customer_name },
          { header: 'Telefone do cliente', value: (row) => row.customer_phone },
          { header: 'E-mail do cliente', value: (row) => row.customer_email },
          { header: 'Status', value: (row) => row.status },
          { header: 'Pagamento', value: (row) => row.payment_summary },
          { header: 'Método', value: (row) => row.payment_method },
          { header: 'Parcelas', value: (row) => row.installments_count },
          { header: 'Total', value: (row) => row.total_amount },
          { header: 'Qtd. itens', value: (row) => row.items_count },
          { header: 'Itens', value: (row) => row.items_summary },
          { header: 'Criado em', value: (row) => row.created_at },
          { header: 'Atualizado em', value: (row) => row.updated_at },
        ])}`,
      }
    }
    case 'expenses': {
      const rows = mapCashMovementRowsForCsv(await fetchCashMovementsForExport('expense'))
      return {
        fileName: getCsvFileName('despesas', now),
        csv: `\uFEFF${objectsToCsv(rows, [
          { header: 'ID', value: (row) => row.id },
          { header: 'Código', value: (row) => row.movement_code },
          { header: 'Tipo', value: (row) => row.type },
          { header: 'Origem', value: (row) => row.origin },
          { header: 'Descrição', value: (row) => row.description },
          { header: 'Valor', value: (row) => row.amount },
          { header: 'Data', value: (row) => row.movement_date },
          { header: 'Método', value: (row) => row.payment_method },
          { header: 'Observações', value: (row) => row.notes },
          { header: 'Venda', value: (row) => row.sale_id },
          { header: 'Pagamento da venda', value: (row) => row.sale_payment_id },
          { header: 'Caixa', value: (row) => row.cash_session_id },
          { header: 'Criado em', value: (row) => row.created_at },
          { header: 'Atualizado em', value: (row) => row.updated_at },
        ])}`,
      }
    }
    case 'stock': {
      const rows = mapStockMovementRowsForCsv(await fetchStockMovementsForExport())
      return {
        fileName: getCsvFileName('estoque', now),
        csv: `\uFEFF${objectsToCsv(rows, [
          { header: 'ID', value: (row) => row.id },
          { header: 'Produto', value: (row) => row.product_name },
          { header: 'Referência', value: (row) => row.product_reference },
          { header: 'Código de barras', value: (row) => row.product_barcode },
          { header: 'Tipo', value: (row) => row.type },
          { header: 'Motivo', value: (row) => row.reason },
          { header: 'Quantidade', value: (row) => row.quantity },
          { header: 'Observações', value: (row) => row.notes },
          { header: 'Venda', value: (row) => row.sale_id },
          { header: 'Movimentação de caixa', value: (row) => row.cash_movement_id },
          { header: 'Criado em', value: (row) => row.created_at },
        ])}`,
      }
    }
    case 'cash': {
      const rows = mapCashMovementRowsForCsv(await fetchCashMovementsForExport())
      return {
        fileName: getCsvFileName('caixa', now),
        csv: `\uFEFF${objectsToCsv(rows, [
          { header: 'ID', value: (row) => row.id },
          { header: 'Código', value: (row) => row.movement_code },
          { header: 'Tipo', value: (row) => row.type },
          { header: 'Origem', value: (row) => row.origin },
          { header: 'Descrição', value: (row) => row.description },
          { header: 'Valor', value: (row) => row.amount },
          { header: 'Data', value: (row) => row.movement_date },
          { header: 'Método', value: (row) => row.payment_method },
          { header: 'Observações', value: (row) => row.notes },
          { header: 'Venda', value: (row) => row.sale_id },
          { header: 'Pagamento da venda', value: (row) => row.sale_payment_id },
          { header: 'Caixa', value: (row) => row.cash_session_id },
          { header: 'Criado em', value: (row) => row.created_at },
          { header: 'Atualizado em', value: (row) => row.updated_at },
        ])}`,
      }
    }
  }
}
