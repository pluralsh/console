// Adapted from https://usehooks-ts.com/react-hook/use-locked-body
// Modified to calculate scrollbar width via document.documentElement if no
// rootId is provided, and to be sure to measure scrollbar width before
// overflow is set to hidden (and thus removing the scrollbar).
import { useEffect, useState } from 'react'

import { useIsomorphicLayoutEffect } from 'usehooks-ts'

import canUseDOM from '../utils/canUseDOM'

type UseLockedBodyOutput = [boolean, (locked: boolean) => void]

function useLockedBody(
  initialLocked = false,
  rootId: string = undefined
): UseLockedBodyOutput {
  const [locked, setLocked] = useState(initialLocked)

  // Do the side effect before render
  useIsomorphicLayoutEffect(() => {
    if (!locked) {
      return
    }

    // Save initial body style
    const originalOverflow = document.body.style.overflow
    const originalPaddingRight = document.body.style.paddingRight

    // Get the scrollBar width
    let scrollBarWidth = 0

    if (canUseDOM) {
      if (rootId) {
        const root = document.getElementById(rootId)

        scrollBarWidth = root ? root.offsetWidth - root.scrollWidth : 0
      } else {
        scrollBarWidth =
          window.innerWidth - document.documentElement.clientWidth
      }
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden'

    // Avoid width reflow
    if (scrollBarWidth) {
      document.body.style.paddingRight = `${scrollBarWidth}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow

      if (scrollBarWidth) {
        document.body.style.paddingRight = originalPaddingRight
      }
    }
  }, [locked])

  // Update state if initialValue changes
  useEffect(() => {
    if (locked !== initialLocked) {
      setLocked(initialLocked)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocked])

  return [locked, setLocked]
}

export default useLockedBody
