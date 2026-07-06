export function registerServiceWorker() {
  if (typeof window === 'undefined') {
    return
  }

  if (!('serviceWorker' in navigator)) {
    return
  }

  if (import.meta.env.DEV) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    })

    if ('caches' in window) {
      void caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('kmoda-pwa-')).map((key) => caches.delete(key)),
        ),
      )
    }

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
