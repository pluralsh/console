import { type ComponentPropsWithRef, type ReactNode, useCallback } from 'react'

import styled from 'styled-components'

import { VisuallyHidden } from 'react-aria'

import * as Dialog from '@radix-ui/react-dialog'

import { CloseIcon } from '../icons'

import IconFrame from './IconFrame'
import { ModalWrapper } from './ModalWrapper'
import { FillLevelContext } from './contexts/FillLevelContext'

const ANIMATION_SPEED = '300ms'

type FlyoverProps = {
  open?: boolean
  onClose?: () => void
  header?: ReactNode
  scrollable?: boolean
  width?: string | number
  minWidth?: number
  children?: ReactNode
} & ComponentPropsWithRef<'div'>

function Flyover({
  ref,
  open = false,
  onClose,
  header,
  scrollable = true,
  width = '40%',
  minWidth = 570,
  children,
  ...props
}: FlyoverProps) {
  const triggerClose = useCallback(
    (open: boolean) => {
      if (!open) onClose?.()
    },
    [onClose]
  )

  return (
    <ModalWrapperSC
      ref={ref}
      open={open}
      onOpenChange={triggerClose}
      $width={width}
      $minWidth={minWidth}
      overlayStyles={{
        justifyContent: 'unset',
        alignItems: 'flex-end',
        padding: 0,
      }}
    >
      <FillLevelContext.Provider value={1}>
        <FlyoverWrapperSC>
          <VisuallyHidden>
            <Dialog.Title>{header}</Dialog.Title>
          </VisuallyHidden>
          {!!header && (
            <FlyoverHeaderWrapSC>
              <FlyoverHeaderSC>{header}</FlyoverHeaderSC>
              <IconFrame
                clickable
                onClick={onClose}
                icon={<CloseIcon />}
              />
            </FlyoverHeaderWrapSC>
          )}
          <FlyoverContentSC
            $scrollable={scrollable}
            {...props}
          >
            {children}
          </FlyoverContentSC>
        </FlyoverWrapperSC>
      </FillLevelContext.Provider>
    </ModalWrapperSC>
  )
}

const ModalWrapperSC = styled(ModalWrapper)<{
  $width: string | number
  $minWidth: number
}>(({ $width, $minWidth }) => ({
  height: '100%',
  width: $width,
  minWidth: `min(100vw, ${$minWidth}px)`,
  '@keyframes slideIn': {
    from: { transform: 'translateX(100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
  },
  '@keyframes slideOut': {
    from: { transform: 'translateX(0)', opacity: 1 },
    to: { transform: 'translateX(100%)', opacity: 0 },
  },
  '&[data-state="open"]': {
    animation: `slideIn ${ANIMATION_SPEED} ease-out`,
  },
  '&[data-state="closed"]': {
    animation: `slideOut ${ANIMATION_SPEED} ease-out`,
  },
}))

const FlyoverWrapperSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero'],
  borderLeft: theme.borders.default,
  boxShadow: theme.boxShadows.modal,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}))

const FlyoverContentSC = styled.div<{
  $scrollable: boolean
}>(({ theme, $scrollable }) => ({
  padding: theme.spacing.large,
  ...theme.partials.text.body1,
  flexGrow: 1,
  ...($scrollable
    ? { overflow: 'auto' }
    : {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }),
}))

const FlyoverHeaderWrapSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 56,
  borderBottom: `1px solid ${theme.colors.border}`,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))

const FlyoverHeaderSC = styled.h1(({ theme }) => ({
  ...theme.partials.text.subtitle1,
  color: theme.colors.text,
}))

export default Flyover
