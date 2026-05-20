import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [message, setMessage] = useState('')
  const [supportsPrompt, setSupportsPrompt] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone
    setInstalled(Boolean(standalone))
    setSupportsPrompt('onbeforeinstallprompt' in window)

    const handleBeforeInstallPrompt = (event: Event) => {
      console.log('[PWA] beforeinstallprompt disparou')
      event.preventDefault()
      const promptEvent = event as BeforeInstallPromptEvent
      console.log('[PWA] deferredPrompt salvo')
      setDeferredPrompt(promptEvent)
    }

    const handleAppInstalled = () => {
      console.log('[PWA] appinstalled disparou')
      setInstalled(true)
      setDeferredPrompt(null)
      setMessage('Aplicativo instalado.')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function promptInstall() {
    if (installed) {
      return
    }

    if (deferredPrompt) {
      console.log('[PWA] clique em instalar aplicativo')
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      console.log('[PWA] userChoice retornou', choice)
      setDeferredPrompt(null)

      if (choice.outcome === 'accepted') {
        setInstalled(true)
      }

      return
    }

    if (!supportsPrompt) {
      setMessage("No celular, abra o menu do navegador e toque em 'Adicionar à tela inicial'.")
    }
  }

  return {
    installed,
    supportsPrompt,
    canPromptInstall: Boolean(deferredPrompt),
    message,
    promptInstall,
    clearMessage: () => setMessage(''),
  }
}
