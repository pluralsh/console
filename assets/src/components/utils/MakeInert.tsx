import { mergeRefs } from 'react-merge-refs'
import {
  ReactElement,
  cloneElement,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react'

export const MakeInert = forwardRef<any, any>(
  (
    { children, inert = false }: { children: ReactElement; inert?: boolean },
    ref
  ) => {
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
)
