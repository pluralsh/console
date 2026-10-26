// DEPRECATED, DO NOT USE
// this is all handled by ModalWrapper now, which is built into the design system modal

/*
Use to ensure Modal exit animations happen but
modal is mounted/unmounted every time 'open' prop changes
to save memory and make sure modal state is reset every
time it opens/closes.
 */

import { usePrevious } from '@pluralsh/design-system'
import { ReactElement, useRef, useState } from 'react'
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
  const [prevOpen, setPrevOpen] = useState(open)
  // this doesn't actually do anything, just to prevent TransitionGroup from using deprecated findDOMNode
  const nodeRef = useRef(null)

  // New key on every open so the modal remounts with fresh state
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setCounter(counter + 1)
  }

  return (
    <TransitionGroup css={{ display: 'none' }}>
      {open || wasOpen ? (
        <Transition
          nodeRef={nodeRef}
          key={counter}
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
