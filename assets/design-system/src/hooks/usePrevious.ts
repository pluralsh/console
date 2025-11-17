import { useEffect, useRef } from 'react'

// https://usehooks.com/usePrevious/
function usePrevious(value: any) {
  const ref = useRef(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

export default usePrevious
