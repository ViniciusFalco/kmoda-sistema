import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000

const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  'click',
  'keydown',
  'input',
  'change',
  'submit',
  'touchstart',
  'wheel',
  'scroll',
]

export function useSessionInactivityTimeout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const timeoutRef = useRef<number | null>(null)
  const lastActivityRef = useRef(Date.now())
  const signingOutRef = useRef(false)

  useEffect(() => {
    if (!user) {
      return undefined
    }

    function clearTimer() {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    async function endSession() {
      if (signingOutRef.current) {
        return
      }

      signingOutRef.current = true
      clearTimer()
      await signOut()
      navigate('/login', { replace: true })
    }

    function scheduleTimer() {
      clearTimer()
      const elapsed = Date.now() - lastActivityRef.current
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed)

      timeoutRef.current = window.setTimeout(() => {
        void endSession()
      }, remaining)
    }

    function markActivity() {
      if (signingOutRef.current) {
        return
      }

      lastActivityRef.current = Date.now()
      scheduleTimer()
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') {
        scheduleTimer()
        return
      }

      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT_MS) {
        void endSession()
        return
      }

      markActivity()
    }

    markActivity()

    ACTIVITY_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, markActivity, { capture: true, passive: true })
    })
    window.addEventListener('focus', markActivity)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimer()
      ACTIVITY_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, markActivity, { capture: true })
      })
      window.removeEventListener('focus', markActivity)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [navigate, signOut, user, location.key])
}
