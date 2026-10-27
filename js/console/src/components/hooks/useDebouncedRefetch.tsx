import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

// deltas tend to arrive in bursts (a sync, a global service fanning out), so
// the refetches they trigger are coalesced
const REFETCH_DEBOUNCE = 500

export function useDebouncedRefetch(refetch: Nullable<() => unknown>) {
  const refetchRef = useRef(refetch)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useLayoutEffect(() => {
    refetchRef.current = refetch
  })

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  return useCallback(() => {
    if (!refetchRef.current) return
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(
      () => refetchRef.current?.(),
      REFETCH_DEBOUNCE
    )
  }, [])
}
