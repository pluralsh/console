import { useEffect } from 'react'

// useful helper for debugging things like modals
// will label a component and log when it mounts and unmounts
export function useMountLogging(name?: string) {
  const id = `${name ? `${name}-` : 'component-'}${Math.round(
    Math.random() * 1000
  )}`

  useEffect(() => {
    console.log(id, 'mounted')

    return () => {
      console.log(id, 'unmounted')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
