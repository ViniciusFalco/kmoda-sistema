import { supabase, isSupabaseConfigured } from './supabase'
import type { UserProfile } from '../types/database'

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

export async function loadUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) {
    return null
  }

  const client = getClient()
  const { data, error } = await client
    .from('profiles')
    .select('id, user_id, name, role, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as UserProfile | null) ?? null
}
