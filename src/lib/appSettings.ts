const DISPLAY_NAME_KEY = 'kmoda.displayName'
const DISPLAY_NAME_EVENT = 'kmoda-display-name-change'
const SENSITIVE_VALUES_HIDDEN_KEY = 'kmoda.sensitiveValuesHidden'
const SENSITIVE_VALUES_HIDDEN_EVENT = 'kmoda-sensitive-values-hidden-change'

export function getDisplayName() {
  if (typeof window === 'undefined') {
    return 'Administrador'
  }

  return window.localStorage.getItem(DISPLAY_NAME_KEY) ?? 'Administrador'
}

export function getGreeting() {
  if (typeof window === 'undefined') {
    return 'Olá'
  }

  const hour = new Date().getHours()

  if (hour < 12) {
    return 'Bom dia'
  }

  if (hour < 18) {
    return 'Boa tarde'
  }

  return 'Boa noite'
}

export function setDisplayName(value: string) {
  if (typeof window === 'undefined') {
    return
  }

  const trimmed = value.trim()
  if (!trimmed) {
    window.localStorage.removeItem(DISPLAY_NAME_KEY)
    return
  }

  window.localStorage.setItem(DISPLAY_NAME_KEY, trimmed)
  window.dispatchEvent(new Event(DISPLAY_NAME_EVENT))
}

export function subscribeDisplayNameChange(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === DISPLAY_NAME_KEY) {
      listener()
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(DISPLAY_NAME_EVENT, listener)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(DISPLAY_NAME_EVENT, listener)
  }
}

export function getSensitiveValuesHidden() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(SENSITIVE_VALUES_HIDDEN_KEY) === 'true'
}

export function setSensitiveValuesHidden(hidden: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SENSITIVE_VALUES_HIDDEN_KEY, hidden ? 'true' : 'false')
  window.dispatchEvent(new Event(SENSITIVE_VALUES_HIDDEN_EVENT))
}

export function subscribeSensitiveValuesHiddenChange(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SENSITIVE_VALUES_HIDDEN_KEY) {
      listener()
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(SENSITIVE_VALUES_HIDDEN_EVENT, listener)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(SENSITIVE_VALUES_HIDDEN_EVENT, listener)
  }
}
