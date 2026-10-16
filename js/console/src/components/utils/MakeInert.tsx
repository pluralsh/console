import { useInert } from '@pluralsh/design-system'
import { ReactElement, RefObject, cloneElement } from 'react'

export function MakeInert({
  ref,
  children,
  inert = false,
}: {
  ref?: RefObject<any>
  children: ReactElement<any>
  inert?: boolean
}) {
  const finalRef = useInert(inert, ref)

  return cloneElement(children, { ref: finalRef })
}
