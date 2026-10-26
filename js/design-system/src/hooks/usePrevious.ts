import { useEffect, useRef } from 'react'

// https://usehooks.com/usePrevious/
function usePrevious(value: any) {
  // Returns the value from the previous render by design, so it must read the
  // ref during render. Callers stay compiler-safe because the hook runs every render.
  'use no memo'
  const ref = useRef(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  // oxlint-disable-next-line react/refs
  return ref.current
}

export default usePrevious
