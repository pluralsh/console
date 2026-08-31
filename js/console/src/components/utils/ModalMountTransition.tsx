// DEPRECATED, DO NOT USE
// this is all handled by ModalWrapper now, which is built into the design system modal

/*
Use to ensure Modal exit animations happen but
modal is mounted/unmounted every time 'open' prop changes
to save memory and make sure modal state is reset every
time it opens/closes.
 */

import { usePrevious } from '@pluralsh/design-system'
import { ReactElement, useLayoutEffect, useRef, useState } from 'react'
import { Transition, TransitionGroup } from 'react-transition-group'

export function ModalMountTransition({
  open,
  children,
}: {
  open: boolean
  children: ReactElement<any>
}) {
  const wasOpen = usePrevious(open)
  const [counter, setCounter] = useState(0)
  // this doesn't actually do anything, just to prevent TransitionGroup from using deprecated findDOMNode
  const nodeRef = useRef(null)

  useLayoutEffect(() => {
    if (open && !wasOpen) {
      setCounter(counter + 1)
    }
  }, [open, counter, wasOpen])
  const key = open && !wasOpen ? counter + 1 : counter

  return (
    <TransitionGroup css={{ display: 'none' }}>
      {open || wasOpen ? (
        <Transition
          nodeRef={nodeRef}
          key={key}
          mountOnEnter
          unmountOnExit
          timeout={500}
        >
          {children}
        </Transition>
      ) : null}
    </TransitionGroup>
  )
}
