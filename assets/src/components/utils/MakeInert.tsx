import { mergeRefs } from 'react-merge-refs'
import {
  ReactElement,
  RefObject,
  cloneElement,
  useLayoutEffect,
  useRef,
} from 'react'

export function MakeInert({
  ref,
  children,
  inert = false,
}: {
  ref?: RefObject<any>
  children: ReactElement<any>
  inert?: boolean
}) {
  const innerRef = useRef<any>(null)
  const finalRef = mergeRefs([innerRef, ref])

  useLayoutEffect(() => {
    if (inert) {
      innerRef.current?.setAttribute('inert', '')
    } else {
      innerRef.current?.removeAttribute('inert')
    }
  }, [inert, innerRef])

  return cloneElement(children, { ref: finalRef })
}
