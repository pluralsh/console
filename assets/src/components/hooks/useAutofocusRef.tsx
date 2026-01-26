import { useEffect, useRef } from 'react'

// returns a ref that focuses an input just on is mount
export function useAutofocusRef() {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.focus()
  }, [])
  return ref
}
