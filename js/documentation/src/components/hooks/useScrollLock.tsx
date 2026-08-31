// Modified from https://usehooks-ts.com/react-hook/use-locked-body
import { useEffect, useState } from 'react'

import { useIsomorphicLayoutEffect } from 'usehooks-ts'

type UseLockedBodyOutput = [boolean, (locked: boolean) => void]

export function getPadding() {
  const paddingRight = parseInt(
    window.getComputedStyle(document.body).paddingRight,
    10
  )
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth

  return paddingRight + scrollbarWidth
}

function useLockedBody(initialLocked = false): UseLockedBodyOutput {
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
    const bodyPadding = getPadding()

    // Lock body scroll
    document.body.style.overflow = 'hidden'

    // Avoid width reflow
    if (bodyPadding) {
      document.body.style.paddingRight = `${bodyPadding}px`
    }

    return () => {
      document.body.style.overflow = originalOverflow

      if (bodyPadding) {
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
