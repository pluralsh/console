import { useEffect, useRef } from 'react'

/**
 * Run function when component is unmounted
 *
 * @param cb Function to run on dismount.
 */
export default function useOnUnMount(cb: () => void) {
  const willUnMount = useRef(false)

  useEffect(
    () => () => {
      willUnMount.current = true
    },
    []
  )
  useEffect(
    () => () => {
      if (willUnMount.current) {
        // Prevent double-calling in react strict mode
        willUnMount.current = false
        cb?.()
      }
    },
    [cb]
  )
}
