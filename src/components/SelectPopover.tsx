import {
  ReactNode, RefObject, useRef,
} from 'react'
import { DismissButton, useOverlay } from '@react-aria/overlays'
import { FocusScope } from '@react-aria/focus'
import styled from 'styled-components'
import { animated } from 'react-spring'

type PopoverProps = {
  isOpen?: boolean
  onClose?: () => unknown
  popoverRef?: RefObject<any>
  children: ReactNode
  animatedStyles: any
}

function Popover({ animatedStyles, ...props }: PopoverProps) {
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
      isOpen={isOpen}
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

  // Wrapping for spring animation
  return (
    <animated.div
      style={{ ...animatedStyles }}
    >
      {content}
    </animated.div>
  )
}

const PopoverStyled = styled.div<{isOpen:boolean}>(({ isOpen }) => ({
  display: 'flex',
  position: 'absolute',
  width: '100%',
  marginTop: 4,
  '> *': {
    flexGrow: 1,
  },
  ...(!isOpen ? { pointerEvents: 'none' } : {}),
}))

export { Popover as SelectPopover }
