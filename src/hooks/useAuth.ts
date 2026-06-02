import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { recordAppActivity } from '../lib/monitoring'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  authReady: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [authReady, setAuthReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Erro ao recuperar sessão do Supabase:', error.message)
      }
      setSession(data.session)
      setLoading(false)
      setAuthReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      setAuthReady(true)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      authReady,
      async signIn(email, password) {
        if (!supabase || !isSupabaseConfigured) {
          return {
            error:
              'Supabase ainda não foi configurado. Preencha as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
          }
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        setSession(data.session)

        if (!error) {
          void recordAppActivity('login', data.user?.id ?? data.session?.user.id ?? null, {
            source: 'auth',
          }).catch((activityError) => {
            console.warn('Não foi possível registrar a atividade de login:', activityError)
          })
        }

        return error ? { error: error.message } : {}
      },
      async signOut() {
        if (supabase) {
          await supabase.auth.signOut()
        }
        setSession(null)
      },
    }),
    [authReady, loading, session],
  )

  return createElement(AuthContext.Provider, { value }, children)
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }

  return context
}
