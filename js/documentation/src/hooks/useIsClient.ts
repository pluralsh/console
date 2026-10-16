import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

// false during SSR and hydration, true afterwards
export const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
