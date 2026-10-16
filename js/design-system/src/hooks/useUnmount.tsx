import { useEffect, useLayoutEffect, useRef } from 'react'

function useUnmount(effect: () => void) {
  const effectRef = useRef(effect)

  useLayoutEffect(() => {
    effectRef.current = effect
  })

  useEffect(
    () => () => {
      effectRef.current()
    },
    []
  )
}

export default useUnmount
