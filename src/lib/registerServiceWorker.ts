export function registerServiceWorker() {
  if (typeof window === 'undefined') {
    return
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  const register = () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Erro ao registrar o service worker:', error)
    })
  }

  if (document.readyState === 'complete') {
    register()
    return
  }

  window.addEventListener('load', register, { once: true })
}
