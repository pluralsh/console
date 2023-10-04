/*
Use to ensure Modal exit animations happen but
modal is mounted/unmounted every time 'open' prop changes
to save memory and make sure modal state is reset every
time it opens/closes.

Investigate incorporating this into new Modal component in
the future
 */

import { usePrevious } from '@pluralsh/design-system'
import { ReactElement, useEffect, useState } from 'react'
import { Transition, TransitionGroup } from 'react-transition-group'

export function ModalMountTransition({
  open,
  children,
}: {
  open: boolean
  children: ReactElement
}) {
  const wasOpen = usePrevious(open)
  const [counter, setCounter] = useState(0)

  useEffect(() => {
    if (open && !wasOpen) {
      setCounter(counter + 1)
    }
  }, [open, counter, wasOpen])
  const key = open && !wasOpen ? counter + 1 : counter

  return (
    <TransitionGroup css={{ display: 'none' }}>
      {open || wasOpen ? (
        <Transition
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
