import { useMutationObserver } from '@react-hooks-library/core'
import { useCallback, useEffect, useState } from 'react'
import { useIntercom } from 'react-use-intercom'

const INTERCOM_CONTAINER_SELECTOR = '#intercom-container .intercom-app'
const MINI_CHAT_NAME = 'intercom-borderless-frame'

// There is no API for seeing when incoming messages appear on screen
// in a mini chat interface, so using a mutation observer to detect presence
// and adding a little hack to close it by opening/closing the main chat
export const useIntercomMini = () => {
  const [containerElt, setContainerElt] = useState<Element | null | undefined>(
    document?.querySelector?.(INTERCOM_CONTAINER_SELECTOR)
  )
  const chatElt = document.getElementsByName(MINI_CHAT_NAME)
  const { show: showIntercom, hide: hideIntercom } = useIntercom()

  const [isOpen, setIsOpen] = useState(chatElt?.length > 0 || false)

  useEffect(() => {
    setContainerElt(document?.querySelector?.(INTERCOM_CONTAINER_SELECTOR))
  }, [])

  useMutationObserver(
    containerElt,
    () => {
      // Intercom container contents changed
      // Look to see if mini chat was added
      const miniChat = document?.getElementsByName?.(MINI_CHAT_NAME)

      if (miniChat.length > 0) {
        setIsOpen(true)
      } else {
        setIsOpen(false)
      }
    },
    { childList: true }
  )

  const forceCloseIntercomMini = useCallback(() => {
    // Hack to close the intercom mini chat interface
    showIntercom()
    hideIntercom()
  }, [hideIntercom, showIntercom])

  return { isOpen, close: forceCloseIntercomMini }
}
