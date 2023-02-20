import { ReactNode, RefObject, useRef } from 'react'
import { DismissButton, useOverlay } from '@react-aria/overlays'
import { FocusScope } from '@react-aria/focus'
import styled from 'styled-components'

type PopoverProps = {
  isOpen?: boolean
  onClose?: () => unknown
  popoverRef?: RefObject<any>
  children: ReactNode
}

function Popover({ ...props }: PopoverProps) {
  const ref = useRef()
  const {
    popoverRef = ref, isOpen, onClose, children,
  } = props

  // Handle events that should cause the popup to close,
  // e.g. blur, clicking outside, or pressing the escape key.
  const { overlayProps } = useOverlay({
    isOpen,
    onClose,
    shouldCloseOnBlur: true,
    isDismissable: true,
  },
  popoverRef)

  // Need to remove ref and change key when closed so react-aria thinks the
  // Popover has unmounted when animating out
  let content = (
    <PopoverStyled
      key={isOpen ? 'open' : 'closed'}
      className="popover"
      $isOpen={isOpen}
      {...overlayProps}
      {...(isOpen && {
        ref: popoverRef,
      })}
    >
      {children}
      {/* Add a hidden <DismissButton> component at the end of the popover
          to allow screen reader users to dismiss the popup easily. */}
      <DismissButton onDismiss={onClose} />
    </PopoverStyled>
  )

  content = <FocusScope restoreFocus>{content}</FocusScope>

  return content
}

const PopoverStyled = styled.div<{ $isOpen: boolean }>(({ $isOpen: isOpen }) => ({
  display: 'flex',
  width: '100%',
  maxHeight: '100%',
  pointerEvents: 'auto',
  '> *': {
    flexGrow: 1,
  },
  ...(!isOpen ? { pointerEvents: 'none' } : {}),
}))

export type { PopoverProps }
export { Popover }
