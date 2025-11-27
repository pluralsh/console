// Hook for implementing WAI-ARIA Disclosure pattern
// https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
import {
  type HTMLAttributes,
  useCallback,
  useId,
  useMemo,
  useState,
} from 'react'

import { mergeProps, useKeyboard } from 'react-aria'

export interface UseDisclosureProps {
  onOpenChange?: (isOpen: boolean) => void
  isOpen?: boolean
  defaultOpen?: boolean
  id?: string
}

export function useDisclosure({
  onOpenChange,
  isOpen,
  defaultOpen = false,
  id,
}: UseDisclosureProps = {}) {
  const generatedId = useId()
  const contentId = id || generatedId
  const [isOpenControlled, setIsOpenControlled] = useState(defaultOpen)

  isOpen = isOpen ?? isOpenControlled

  const toggleOpen = useCallback(() => {
    setIsOpenControlled(!isOpen)
    onOpenChange?.(!isOpen)
  }, [isOpen, onOpenChange])
  const { keyboardProps } = useKeyboard({
    onKeyDown(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleOpen()
      }
    },
  })

  const triggerProps = useMemo<HTMLAttributes<HTMLElement>>(() => {
    const myProps: HTMLAttributes<HTMLElement> = {
      role: 'button',
      tabIndex: 0,
      'aria-controls': contentId,
      'aria-expanded': !!isOpen,
      onClick: () => {
        toggleOpen()
      },
    }

    return mergeProps(keyboardProps, myProps)
  }, [contentId, isOpen, keyboardProps, toggleOpen])

  const contentProps = useMemo(
    () => ({
      id: contentId,
    }),
    [contentId]
  )

  return useMemo(
    () => ({
      triggerProps,
      contentProps,
      isOpen,
    }),
    [contentProps, isOpen, triggerProps]
  )
}
