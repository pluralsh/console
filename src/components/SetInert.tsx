import { type ReactElement, cloneElement, forwardRef } from 'react'

import { useInert } from '../hooks/useInert'

export const SetInert = forwardRef<any, any>(
  (
    { children, inert = false }: { children: ReactElement; inert?: boolean },
    ref
  ) => {
    const finalRef = useInert(inert, ref)

    return cloneElement(children, { ref: finalRef })
  }
)
