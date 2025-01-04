// this is just styling, actual modal logic is in ModalWrapper

import { type ComponentPropsWithRef, type ReactNode, useCallback } from 'react'

import styled, { useTheme } from 'styled-components'

import { type ColorKey, type Nullable, type SeverityExt } from '../types'

import Card from './Card'
import CheckRoundedIcon from './icons/CheckRoundedIcon'
import type createIcon from './icons/createIcon'
import ErrorIcon from './icons/ErrorIcon'
import InfoIcon from './icons/InfoIcon'
import WarningIcon from './icons/WarningIcon'
import { ModalWrapper, type ModalWrapperProps } from './ModalWrapper'

export const SEVERITIES = [
  'info',
  'warning',
  'success',
  'danger',
] as const satisfies Readonly<SeverityExt[]>
const SIZES = ['medium', 'large', 'custom', 'auto'] as const

type ModalSeverity = Extract<SeverityExt, (typeof SEVERITIES)[number]>

type ModalSize = (typeof SIZES)[number]

type ModalPropsType = ModalWrapperProps & {
  onClose?: Nullable<() => void>
  form?: boolean
  scrollable?: boolean
  size?: ModalSize
  header?: ReactNode
  actions?: ReactNode
  severity?: ModalSeverity
  asForm?: boolean
  formProps?: ComponentPropsWithRef<'form'>
}

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
  auto: 'auto',
  custom: undefined as undefined,
} as const satisfies Partial<Record<ModalSize, number | string | undefined>>

const ModalSC = styled(Card)<{
  $width: number | string
  $maxWidth: number | string
}>(({ $width, $maxWidth }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: $width,
  maxWidth: $maxWidth,
}))

const ModalContentSC = styled.div<{
  $scrollable: boolean
  $hasActions: boolean
}>(({ theme, $scrollable, $hasActions }) => ({
  position: 'relative',
  zIndex: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: $scrollable ? 'auto' : 'hidden',
  margin: theme.spacing.large,
  marginBottom: $hasActions ? 0 : theme.spacing.large,
  ...theme.partials.text.body1,
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

function Modal({
  children,
  header,
  actions,
  open = false,
  form = false,
  size = form ? 'large' : 'medium',
  onClose,
  severity,
  asForm = false,
  formProps = {},
  scrollable = true,
  ...props
}: ModalPropsType) {
  const theme = useTheme()
  const HeaderIcon = severityToIcon[severity ?? 'default']
  const iconColorKey = severityToIconColorKey[severity ?? 'default']

  const triggerClose = useCallback(
    (open: boolean) => {
      if (!open) onClose?.()
    },
    [onClose]
  )

  const maxWidth =
    size === 'auto'
      ? `min(1000px, 100vw - ${theme.spacing.xlarge * 2}px)`
      : sizeToWidth[size]

  return (
    <ModalWrapper
      open={open}
      onOpenChange={triggerClose}
      title={typeof header === 'string' ? header : 'Dialog'}
      {...props}
    >
      <ModalSC
        fillLevel={1}
        forwardedAs={asForm ? 'form' : undefined}
        $width={sizeToWidth[size]}
        $maxWidth={maxWidth}
        {...(asForm ? formProps : {})}
      >
        <ModalContentSC
          $scrollable={scrollable}
          $hasActions={!!actions}
        >
          {!!header && (
            <ModalHeaderWrapSC>
              {HeaderIcon && (
                <HeaderIcon
                  marginTop={-2}
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
    </ModalWrapper>
  )
}

export default Modal
