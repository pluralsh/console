import { type ReactNode, type Ref, forwardRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import styled, { type StyledComponentPropsWithRef } from 'styled-components'

import { type ModalProps } from 'honorable'

import useLockedBody from '../hooks/useLockedBody'

import { CloseIcon } from '../icons'

import { HonorableModal } from './HonorableModal'
import IconFrame from './IconFrame'

type FlyoverPropsType = Omit<ModalProps, 'size'> & {
  header?: ReactNode
  lockBody?: boolean
  scrollable?: boolean
  asForm?: boolean
  formProps?: StyledComponentPropsWithRef<'form'>
  width?: string
  minWidth?: number
  [x: string]: unknown
}

const propTypes = {
  header: PropTypes.node,
  lockBody: PropTypes.bool,
  scrollable: PropTypes.bool,
  asForm: PropTypes.bool,
  width: PropTypes.string,
  minWidth: PropTypes.number,
} as const

const FlyoverSC = styled.div(({ theme }) => ({
  position: 'relative',
  backgroundColor: theme.colors['fill-zero'],
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}))

const FlyoverContentSC = styled.div<{
  $scrollable: boolean
}>(({ theme, $scrollable }) => ({
  position: 'relative',
  zIndex: 0,
  margin: 0,
  padding: theme.spacing.large,
  backgroundColor: theme.colors['fill-zero'],
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
  alignItems: 'center',
  justifyContent: 'start',
  gap: theme.spacing.small,
  height: 56,
  borderBottom: `1px solid ${theme.colors.border}`,
  backgroundColor: theme.colors.grey[950],
  display: 'flex',
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))

const FlyoverHeaderSC = styled.h1(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.subtitle1,
  color: theme.colors.semanticDefault,
}))

function FlyoverRef(
  {
    children,
    header,
    open = false,
    onClose,
    lockBody = true,
    asForm = false,
    formProps = {},
    scrollable = true,
    width = '40%',
    minWidth = 570,
    ...props
  }: FlyoverPropsType,
  ref: Ref<any>
) {
  const [, setBodyLocked] = useLockedBody(open && lockBody)

  useEffect(() => {
    setBodyLocked(lockBody && open)
  }, [lockBody, open, setBodyLocked])

  return (
    <HonorableModal
      open={open}
      onClose={onClose}
      ref={ref}
      scrollable={scrollable}
      margin={0}
      padding={0}
      right="100%"
      height="100%"
      width={width}
      minWidth={minWidth}
      alignSelf="flex-end"
      BackdropProps={{ backgroundColor: 'transparent' }}
      InnerDefaultStyle={{
        opacity: 0,
        transform: 'translateX(0)',
        transition: 'transform 300ms ease, opacity 300ms ease',
      }}
      InnerTransitionStyle={{
        entering: { opacity: 1, transform: 'translateX(0)' },
        entered: { opacity: 1, transform: 'translateX(0)' },
        exiting: { opacity: 0, transform: 'translateX(1000px)' },
        exited: { opacity: 0, transform: 'translateX(1000px)' },
      }}
      {...props}
    >
      <FlyoverSC
        as={asForm ? 'form' : undefined}
        {...(asForm ? formProps : {})}
      >
        {!!header && (
          <FlyoverHeaderWrapSC ref={ref}>
            <IconFrame
              textValue=""
              display="flex"
              size="small"
              clickable
              onClick={onClose}
              icon={<CloseIcon />}
            />
            <FlyoverHeaderSC>{header}</FlyoverHeaderSC>
          </FlyoverHeaderWrapSC>
        )}
        <FlyoverContentSC $scrollable={scrollable}>{children}</FlyoverContentSC>
      </FlyoverSC>
    </HonorableModal>
  )
}

const Flyover = forwardRef(FlyoverRef)

Flyover.propTypes = propTypes

export default Flyover
