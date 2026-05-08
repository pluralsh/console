import { useEffect, useRef } from 'react'

// returns a ref that focuses an element on mount
export function useAutofocusRef<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return ref
}
