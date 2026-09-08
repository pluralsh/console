// basically the internal part of mergeRefs, but makes react-compiler eslint happy
import { Ref } from 'react'

export function applyNodeToRefs(
  refArray: Nullable<Ref<HTMLElement>>[],
  node: HTMLElement | null
) {
  refArray.forEach((ref) => {
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  })
}
