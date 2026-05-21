export function normalizeBarcode(code: string) {
  return code.replace(/[\r\n]+/g, '').trim()
}

export function isValidBarcode(code: string) {
  return normalizeBarcode(code).length > 0
}
