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
import { loadUserProfile } from '../lib/profileSettings'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { UserProfile } from '../types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isAdmin: boolean
  loading: boolean
  authReady: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [authReady, setAuthReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) {
      return undefined
    }

    let active = true

    async function syncSessionProfile(nextSession: Session | null) {
      if (!active) {
        return
      }

      if (!nextSession?.user) {
        setProfile(null)
        setLoading(false)
        setAuthReady(true)
        return
      }

      try {
        const nextProfile = await loadUserProfile(nextSession.user.id)
        if (active) {
          setProfile(nextProfile)
        }
      } catch (error) {
        console.error('Erro ao carregar perfil do usuário:', error)
        if (active) {
          setProfile(null)
        }
      } finally {
        if (active) {
          setLoading(false)
          setAuthReady(true)
        }
      }
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Erro ao recuperar sessão do Supabase:', error.message)
      }
      setSession(data.session)
      void syncSessionProfile(data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(true)
      void syncSessionProfile(nextSession)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      isAdmin: profile?.role === 'admin',
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
        setProfile(null)
      },
    }),
    [authReady, loading, profile, session],
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
