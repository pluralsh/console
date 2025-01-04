// styling here mostly just for the overlay and animations
import * as Dialog from '@radix-ui/react-dialog'
import { FocusScope } from '@radix-ui/react-focus-scope'
import { type ComponentPropsWithRef, type ReactNode } from 'react'
import { VisuallyHidden } from 'react-aria'
import styled, { type CSSObject, useTheme } from 'styled-components'

import WrapWithIf from './WrapWithIf'

const ANIMATION_SPEED = '150ms'

export type ModalWrapperProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  overlayStyles?: CSSObject
  children?: ReactNode
} & ComponentPropsWithRef<typeof Dialog.Content>

function ModalWrapper({
  open,
  onOpenChange,
  overlayStyles,
  title,
  children,
  ...props
}: ModalWrapperProps) {
  const theme = useTheme()
  const portalElement = document.getElementById(theme.portals.default.id)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal container={portalElement}>
        <OverlaySC
          onClick={(e) => e.stopPropagation()}
          style={overlayStyles}
        >
          <WrapWithIf
            condition={// band-aid for firefox not letting our select component open inside a modal
            // see https://github.com/radix-ui/primitives/issues/2544
            navigator?.userAgent.toLowerCase().includes('firefox')}
            wrapper={
              <FocusScope
                trapped={false}
                loop
              />
            }
          >
            <ContentSC {...props}>
              <VisuallyHidden>
                <Dialog.Title>{title}</Dialog.Title>
              </VisuallyHidden>
              {children}
            </ContentSC>
          </WrapWithIf>
        </OverlaySC>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

const ContentSC = styled(Dialog.Content)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  boxShadow: theme.boxShadows.modal,
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
}))

const OverlaySC = styled(Dialog.Overlay)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'fixed',
  inset: 0,
  background: theme.colors['modal-backdrop'],
  padding: theme.spacing.xlarge,
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

export { ModalWrapper }
