import { useEffect, useState, useSyncExternalStore } from 'react'
import { useAuth } from './useAuth'
import {
  getSensitiveValuesHidden,
  setSensitiveValuesHidden,
  subscribeSensitiveValuesHiddenChange,
} from '../lib/appSettings'
import { loadDisplayName, subscribeDisplayNameChange } from '../lib/profileSettings'

export function useDisplayName() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('Administrador')

  useEffect(() => {
    let active = true

    async function load() {
      if (!user) {
        if (active) {
          setDisplayName('Administrador')
        }
        return
      }

      try {
        const name = await loadDisplayName(user.id)
        if (active) {
          setDisplayName(name || 'Administrador')
        }
      } catch {
        if (active) {
          setDisplayName('Administrador')
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [user])

  useEffect(
    () =>
      subscribeDisplayNameChange(() => {
        if (user) {
          void loadDisplayName(user.id)
            .then((name) => setDisplayName(name || 'Administrador'))
            .catch(() => setDisplayName('Administrador'))
        }
      }),
    [user],
  )

  return displayName
}

export function useSensitiveValuesHidden() {
  const hidden = useSyncExternalStore(
    subscribeSensitiveValuesHiddenChange,
    getSensitiveValuesHidden,
    () => false,
  )

  const updateHidden = (value: boolean | ((current: boolean) => boolean)) => {
    const nextValue = typeof value === 'function' ? value(getSensitiveValuesHidden()) : value
    setSensitiveValuesHidden(nextValue)
  }

  return [hidden, updateHidden] as const
}
