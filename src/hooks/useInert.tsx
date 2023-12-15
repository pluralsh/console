import { type Ref, useLayoutEffect, useRef } from 'react'
import { mergeRefs } from 'react-merge-refs'

export function useInert(inert: boolean, ref?: Ref<any>) {
  const innerRef = useRef<any>(null)
  const finalRef = mergeRefs([innerRef, ref])

  useLayoutEffect(() => {
    if (inert) {
      innerRef.current?.setAttribute?.('inert', '')
    } else {
      innerRef.current?.removeAttribute?.('inert')
    }
  }, [inert, innerRef])

  return finalRef
}
