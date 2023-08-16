import { useEffect } from 'react'
import { useIntercom } from 'react-use-intercom'

import { usePrevious } from '@pluralsh/design-system'

export function IntercomChat({ onClose }: { onClose: () => void }) {
  const { show, hide, isOpen } = useIntercom()
  const wasOpen = usePrevious(isOpen)

  useEffect(() => {
    if (!isOpen && wasOpen) {
      onClose()
    }
  }, [isOpen, wasOpen, onClose])

  useEffect(() => {
    show()

    return () => {
      hide()
    }
  }, [show, hide])

  return null
}
