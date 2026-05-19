const DISPLAY_NAME_KEY = 'kmoda.displayName'
const DISPLAY_NAME_EVENT = 'kmoda-display-name-change'

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
