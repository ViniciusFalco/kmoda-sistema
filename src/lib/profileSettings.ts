import { supabase, isSupabaseConfigured } from './supabase'
import type { UserProfile, UserRole } from '../types/database'

export interface PinProfileLookup {
  user_id: string
  name: string
  role: UserRole
  active: boolean
  auth_email: string
}

export interface AdminUserAccount {
  user_id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  pin_configured: boolean
  created_at: string
  updated_at: string
}

const DISPLAY_NAME_EVENT = 'kmoda-display-name-change'

function getClient() {
  if (!supabase) {
    throw new Error('Supabase não configurado.')
  }

  return supabase
}

export function subscribeDisplayNameChange(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(DISPLAY_NAME_EVENT, listener)

  return () => {
    window.removeEventListener(DISPLAY_NAME_EVENT, listener)
  }
}

export function notifyDisplayNameChange() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new Event(DISPLAY_NAME_EVENT))
}

export async function loadDisplayName(userId: string) {
  const profile = await loadUserProfile(userId)
  return profile?.name?.trim() || null
}

export async function saveDisplayName(userId: string, name: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado.')
  }

  const trimmed = name.trim()
  const client = getClient()
  const { data, error } = await client
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        name: trimmed,
      },
      { onConflict: 'user_id' },
    )
    .select('name')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  notifyDisplayNameChange()
  return data?.name?.trim() || trimmed
}

export async function setMyPin(userId: string, pin: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado.')
  }

  const trimmedPin = pin.trim()
  if (!/^\d{6}$/.test(trimmedPin)) {
    throw new Error('O PIN precisa ter 6 dígitos.')
  }

  const client = getClient()
  const { error } = await client.rpc('set_my_pin', {
    p_pin: trimmedPin,
    p_user_id: userId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function lookupProfileByPin(pin: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado.')
  }

  const trimmedPin = pin.trim()
  if (!/^\d{6}$/.test(trimmedPin)) {
    throw new Error('O PIN precisa ter 6 dígitos.')
  }

  const client = getClient()
  const { data, error } = await client.rpc('get_profile_by_pin', { p_pin: trimmedPin })

  if (error) {
    throw new Error(error.message)
  }

  return (data?.[0] ?? null) as PinProfileLookup | null
}

export async function sendPinRecoveryEmail(email: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado.')
  }

  const client = getClient()
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    throw new Error('Informe um e-mail válido.')
  }

  const appUrl =
    (import.meta.env.VITE_APP_URL as string | undefined)?.trim() ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  const redirectTo = appUrl ? `${appUrl.replace(/\/$/, '')}/redefinir-pin` : undefined

  const { error } = await client.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function listAdminUserAccounts() {
  if (!isSupabaseConfigured) {
    return []
  }

  const client = getClient()
  const { data, error } = await client.rpc('admin_list_user_accounts')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as AdminUserAccount[]
}

export async function findAdminUserByEmail(email: string) {
  if (!isSupabaseConfigured) {
    return null
  }

  const client = getClient()
  const { data, error } = await client.rpc('admin_find_user_by_email', {
    p_email: email.trim(),
  })

  if (error) {
    throw new Error(error.message)
  }

  return (data?.[0] ?? null) as AdminUserAccount | null
}

export async function saveAdminUserAccount(input: {
  userId: string
  name: string
  role: UserRole
  active: boolean
}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase não configurado.')
  }

  const client = getClient()
  const { error } = await client.rpc('admin_upsert_user_profile', {
    p_user_id: input.userId,
    p_name: input.name.trim(),
    p_role: input.role,
    p_active: input.active,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const client = getClient()
  const { data, error } = await client
    .from('profiles')
    .select('id, user_id, name, role, active, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as UserProfile | null) ?? null
}
