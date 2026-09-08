import { type ReactElement, type RefObject, cloneElement } from 'react'

import { useInert } from '../hooks/useInert'

export const SetInert = ({
  ref,
  children,
  inert = false,
}: { children: ReactElement<any>; inert?: boolean } & {
  ref?: RefObject<any>
}) => {
  const finalRef = useInert(inert, ref)

  return cloneElement(children, { ref: finalRef })
}
