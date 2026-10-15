// basically the internal part of mergeRefs, but satisfies the React Compiler lint rules
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
