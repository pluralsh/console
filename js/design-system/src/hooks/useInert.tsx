import { type Ref, type RefCallback, useLayoutEffect, useState } from 'react'
import { mergeRefs } from 'react-merge-refs'

export function useInert(inert: boolean, ref?: Ref<any>): RefCallback<any> {
  const [node, setNode] = useState<any>(null)

  useLayoutEffect(() => {
    if (inert) {
      node?.setAttribute?.('inert', '')
    } else {
      node?.removeAttribute?.('inert')
    }
  }, [inert, node])

  return mergeRefs([setNode, ref])
}
