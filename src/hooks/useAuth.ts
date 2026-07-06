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
import { lookupProfileByPin, loadUserProfile } from '../lib/profileSettings'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { UserProfile, UserRole } from '../types/database'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isAdmin: boolean
  isCashier: boolean
  loading: boolean
  authReady: boolean
  signInWithPin: (pin: string) => Promise<{ error?: string; role?: UserRole }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [authReady, setAuthReady] = useState(!supabase)

  useEffect(() => {
    const client = supabase

    if (!client) {
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
        if (!nextProfile || nextProfile.active === false) {
          await client!.auth.signOut()
          if (active) {
            setSession(null)
            setProfile(null)
          }
          return
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

    client.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Erro ao recuperar sessão do Supabase:', error.message)
      }
      setSession(data.session)
      void syncSessionProfile(data.session)
    })

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
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
      isCashier: profile ? profile.role !== 'admin' : false,
      loading,
      authReady,
      async signInWithPin(pin) {
        if (!supabase || !isSupabaseConfigured) {
          return {
            error:
              'Supabase ainda não foi configurado. Preencha as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
          }
        }

        let profileLookup

        try {
          profileLookup = await lookupProfileByPin(pin)
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'PIN inválido.' }
        }

        if (!profileLookup) {
          return { error: 'PIN inválido.' }
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: profileLookup.auth_email,
          password: pin.trim(),
        })

        setSession(data.session ?? null)

        if (!error) {
          void recordAppActivity('login', data.user?.id ?? data.session?.user.id ?? null, {
            source: 'auth',
          }).catch((activityError) => {
            console.warn('Não foi possível registrar a atividade de login:', activityError)
          })
        }

        return error ? { error: error.message } : { role: profileLookup.role }
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
