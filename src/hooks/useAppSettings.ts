import { useEffect, useState } from 'react'
import { getDisplayName, subscribeDisplayNameChange } from '../lib/appSettings'

export function useDisplayName() {
  const [displayName, setDisplayName] = useState(getDisplayName())

  useEffect(() => subscribeDisplayNameChange(() => setDisplayName(getDisplayName())), [])

  return displayName
}
