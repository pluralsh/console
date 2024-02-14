import { type ReactNode, type Ref, forwardRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import styled, { type StyledComponentPropsWithRef } from 'styled-components'

import { type ColorKey, type SeverityExt } from '../types'

import useLockedBody from '../hooks/useLockedBody'

import { HonorableModal, type ModalProps } from './HonorableModal'

import CheckRoundedIcon from './icons/CheckRoundedIcon'
import type createIcon from './icons/createIcon'
import ErrorIcon from './icons/ErrorIcon'
import WarningIcon from './icons/WarningIcon'
import InfoIcon from './icons/InfoIcon'

export const SEVERITIES = [
  'info',
  'warning',
  'success',
  'danger',
] as const satisfies Readonly<SeverityExt[]>
const SIZES = ['medium', 'large'] as const

type ModalSeverity = Extract<SeverityExt, (typeof SEVERITIES)[number]>

type ModalSize = (typeof SIZES)[number]

type ModalPropsType = Omit<ModalProps, 'size'> & {
  form?: boolean
  size?: ModalSize
  header?: ReactNode
  actions?: ReactNode
  severity?: ModalSeverity
  lockBody?: boolean
  asForm?: boolean
  formProps?: StyledComponentPropsWithRef<'form'>
  scrollable?: boolean
  [x: string]: unknown
}

const propTypes = {
  form: PropTypes.bool,
  size: PropTypes.oneOf(SIZES),
  header: PropTypes.node,
  actions: PropTypes.node,
  severity: PropTypes.oneOf(SEVERITIES),
  lockBody: PropTypes.bool,
} as const

const severityToIconColorKey = {
  default: 'icon-default',
  info: 'icon-info',
  danger: 'icon-danger',
  warning: 'icon-warning',
  success: 'icon-success',
} as const satisfies Readonly<Record<ModalSeverity | 'default', ColorKey>>

const severityToIcon = {
  default: null as null,
  info: InfoIcon,
  danger: ErrorIcon,
  warning: WarningIcon,
  success: CheckRoundedIcon,
} as const satisfies Record<
  ModalSeverity | 'default',
  ReturnType<typeof createIcon> | null | undefined
>

const sizeToWidth = {
  medium: 480,
  large: 608,
} as const satisfies Record<ModalSize, number>

const ModalSC = styled.div<{ $scrollable: boolean }>(({ $scrollable }) => ({
  position: 'relative',
  ...($scrollable
    ? {}
    : {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }),
}))

const ModalContentSC = styled.div<{
  $scrollable: boolean
  $hasActions: boolean
}>(({ theme, $scrollable, $hasActions }) => ({
  margin: theme.spacing.large,
  marginBottom: $hasActions ? 0 : theme.spacing.large,
  ...theme.partials.text.body1,
  ...($scrollable
    ? {}
    : {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }),
}))

const ModalActionsSC = styled.div((_) => ({
  display: 'flex',
  position: 'sticky',
  flexDirection: 'column',
  bottom: '0',
}))

const gradientHeight = 12
const ModalActionsGradientSC = styled.div(({ theme }) => ({
  display: 'flex',
  background: `linear-gradient(180deg, transparent 0%, ${theme.colors['fill-one']} 100%);`,
  height: gradientHeight,
}))
const ModalActionsContentSC = styled.div(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.large,
  paddingTop: theme.spacing.large - gradientHeight,
  alignItems: 'center',
  justifyContent: 'flex-end',
  backgroundColor: theme.colors['fill-one'],
}))

const ModalHeaderWrapSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  justifyContent: 'start',
  marginBottom: theme.spacing.large,
  gap: theme.spacing.xsmall,
}))

const ModalHeaderSC = styled.h1(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))

function ModalRef(
  {
    children,
    header,
    actions,
    open = false,
    form = false,
    size = form ? 'large' : 'medium',
    onClose,
    severity,
    lockBody = true,
    asForm = false,
    formProps = {},
    scrollable = true,
    ...props
  }: ModalPropsType,
  ref: Ref<any>
) {
  const HeaderIcon = severityToIcon[severity ?? 'default']
  const iconColorKey = severityToIconColorKey[severity ?? 'default']

  const [, setBodyLocked] = useLockedBody(open && lockBody)

  useEffect(() => {
    setBodyLocked(lockBody && open)
  }, [lockBody, open, setBodyLocked])

  return (
    <HonorableModal
      open={open}
      onClose={onClose}
      ref={ref}
      width={sizeToWidth[size]}
      maxWidth={sizeToWidth[size]}
      scrollable={scrollable}
      {...props}
    >
      <ModalSC
        as={asForm ? 'form' : undefined}
        $scrollable={scrollable}
        {...(asForm ? formProps : {})}
      >
        <ModalContentSC
          $scrollable={scrollable}
          $hasActions={!!actions}
        >
          {!!header && (
            <ModalHeaderWrapSC ref={ref}>
              {HeaderIcon && (
                <HeaderIcon
                  marginTop={-2} // optically center icon
                  color={iconColorKey}
                />
              )}
              <ModalHeaderSC>{header}</ModalHeaderSC>
            </ModalHeaderWrapSC>
          )}
          {children}
        </ModalContentSC>
        {!!actions && (
          <ModalActionsSC>
            <ModalActionsGradientSC />
            <ModalActionsContentSC>{actions}</ModalActionsContentSC>
          </ModalActionsSC>
        )}
      </ModalSC>
    </HonorableModal>
  )
}

const Modal = forwardRef(ModalRef)

Modal.propTypes = propTypes

export default Modal
