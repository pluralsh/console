// useful hooks to use in development (generally meant to be removed beforemerging code)
import { useEffect, useMemo } from 'react'

// for debugging things like modals
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
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

// for making sure things like tables work correctly with lots of items
// duplicates the passed in array but still gives each object a unique id
export function useFillMockArr<T>(sample: T[], size: number): T[] {
  return useMemo(
    () =>
      Array(size)
        .fill(sample)
        .flat()
        .map((item, i) => ({ ...item, id: `${i}` })),
    [sample, size]
  )
}
