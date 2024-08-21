// styling here mostly just for the overlay and animations
import * as Dialog from '@radix-ui/react-dialog'

import { type ComponentProps, type ReactNode, forwardRef } from 'react'
import styled, { useTheme } from 'styled-components'

const ANIMATION_SPEED = '150ms'

export type ModalWrapperProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  scrollable?: boolean
  children?: ReactNode
} & ComponentProps<'div'>

function ModalWrapperRef(
  {
    open,
    onOpenChange,
    scrollable = true,
    children,
    ...props
  }: ModalWrapperProps,
  ref: any
) {
  const theme = useTheme()
  const portalElement = document.getElementById(theme.portals.default.id)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal container={portalElement}>
        <OverlaySC>
          <ContentSC
            ref={ref}
            $scrollable={scrollable}
            {...props}
          >
            {children}
          </ContentSC>
        </OverlaySC>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const ContentSC = styled(Dialog.Content)<{ $scrollable?: boolean }>(
  ({ $scrollable }) => ({
    overflowY: $scrollable ? 'auto' : 'hidden',
    maxHeight: '100%',
    '@keyframes popIn': {
      from: { transform: 'scale(0.8)' },
      to: { transform: 'scale(1)' },
    },
    '@keyframes popOut': {
      from: { transform: 'scale(1)' },
      to: { transform: 'scale(0.9)' },
    },
    '&[data-state="open"]': {
      animation: `popIn ${ANIMATION_SPEED} ease-out`,
    },
    '&[data-state="closed"]': {
      animation: `popOut ${ANIMATION_SPEED} ease-out`,
    },
  })
)
const OverlaySC = styled(Dialog.Overlay)(({ theme }) => ({
  background: theme.colors['modal-backdrop'],
  position: 'fixed',
  padding: theme.spacing.xlarge,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'grid',
  placeItems: 'center',
  zIndex: theme.zIndexes.modal,
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  '@keyframes fadeOut': {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  '&[data-state="open"]': {
    animation: `fadeIn ${ANIMATION_SPEED} ease-out`,
  },
  '&[data-state="closed"]': {
    animation: `fadeOut ${ANIMATION_SPEED} ease-out`,
  },
}))

export const ModalWrapper = forwardRef(ModalWrapperRef)
