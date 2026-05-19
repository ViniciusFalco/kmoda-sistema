export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(value: number) {
  return formatCurrencyBRL(value)
}

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatDate(value: string) {
  return formatDateBR(value)
}

export function formatDateBR(value?: string | null) {
  if (!value) {
    return '-'
  }

  const [datePart] = value.split('T')
  const [year, month, day] = datePart.split('-')

  if (year && month && day) {
    return `${day}/${month}/${year}`
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function getTodayLocalDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function todayISODate() {
  return getTodayLocalDate()
}

export function getNowLocalTimestamp() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export function parseDateInput(value: string) {
  return value
}

export function parseCurrencyToNumber(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  return formatCurrencyBRL(Number(digits) / 100)
}

export function onlyNumbers(value: string) {
  return value.replace(/\D/g, '')
}

export function normalizePhone(value: string) {
  return onlyNumbers(value).slice(0, 11)
}

export function formatPhoneBR(value?: string | null) {
  const digits = normalizePhone(value ?? '')

  if (!digits) {
    return '-'
  }

  const areaCode = digits.slice(0, 2)
  const firstDigit = digits.slice(2, 3)
  const middle = digits.slice(3, 7)
  const last = digits.slice(7, 11)

  if (digits.length <= 2) {
    return `(${areaCode}`
  }

  if (digits.length <= 3) {
    return `(${areaCode}) ${firstDigit}`
  }

  if (digits.length <= 7) {
    return `(${areaCode}) ${firstDigit} ${middle}`
  }

  return `(${areaCode}) ${firstDigit} ${middle}-${last}`
}

export function normalizeCPF(value: string) {
  return onlyNumbers(value).slice(0, 11)
}

export function formatCPF(value?: string | null) {
  const digits = normalizeCPF(value ?? '')

  if (!digits) {
    return '-'
  }

  if (digits.length <= 3) {
    return digits
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`
  }

  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}
